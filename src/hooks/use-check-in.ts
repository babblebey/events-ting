/**
 * useCheckIn Hook
 * Custom hook for managing attendee check-in operations with optimistic updates
 *
 * Features:
 * - Optimistic UI updates for immediate feedback
 * - Automatic rollback on error
 * - Query invalidation on success
 * - Loading state management
 *
 * @example
 * ```tsx
 * const { checkIn, isCheckingIn, checkingInTicketId } = useCheckIn({
 *   eventId,
 *   currentFilter: "all",
 *   currentPage: 0,
 *   currentSearch: undefined,
 * });
 *
 * // Check in a ticket
 * checkIn("TKT-12345", {
 *   onSuccess: () => {
 *     toast.success("Attendee checked in successfully!");
 *   },
 * });
 * ```
 */

import { useState } from "react";
import { api } from "@/trpc/react";

interface UseCheckInOptions {
  eventId: string;
  currentFilter: "all" | "checked-in" | "not-checked-in";
  currentPage: number;
  currentSearch?: string;
}

interface CheckInCallbacks {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useCheckIn({
  eventId,
  currentFilter,
  currentPage,
  currentSearch,
}: UseCheckInOptions) {
  const [checkingInTicketId, setCheckingInTicketId] = useState<string | null>(
    null,
  );
  const utils = api.useUtils();

  // Check-in mutation with optimistic updates
  const checkInMutation = api.checkIn.checkInTicket.useMutation({
    onMutate: async (input) => {
      // Find the ticket being checked in to get its ID
      const currentData = utils.checkIn.listAttendees.getData({
        eventId,
        filter: currentFilter,
        search: currentSearch,
        page: currentPage,
        pageSize: 50,
      });

      const ticketToCheckIn = currentData?.attendees.find(
        (a) => a.ticketNumber === input.ticketNumber,
      );

      if (ticketToCheckIn) {
        setCheckingInTicketId(ticketToCheckIn.ticketId);
      }

      // Cancel outgoing refetches to prevent race conditions
      await Promise.all([
        utils.checkIn.listAttendees.cancel({
          eventId,
          filter: currentFilter,
          search: currentSearch,
          page: currentPage,
        }),
        utils.checkIn.getMetrics.cancel({ eventId }),
      ]);

      // Snapshot previous values for rollback
      const previousData = utils.checkIn.listAttendees.getData({
        eventId,
        filter: currentFilter,
        search: currentSearch,
        page: currentPage,
      });

      const previousMetrics = utils.checkIn.getMetrics.getData({ eventId });

      // Optimistically update the attendee list cache
      utils.checkIn.listAttendees.setData(
        {
          eventId,
          filter: currentFilter,
          search: currentSearch,
          page: currentPage,
        },
        (old) => {
          if (!old) return old;

          return {
            ...old,
            attendees: old.attendees.map((attendee) =>
              attendee.ticketNumber === input.ticketNumber
                ? {
                    ...attendee,
                    isCheckedIn: true,
                    checkedInAt: new Date(),
                  }
                : attendee,
            ),
          };
        },
      );

      // Optimistically update the metrics cache
      utils.checkIn.getMetrics.setData({ eventId }, (old) => {
        if (!old) return old;

        const wasAlreadyCheckedIn = ticketToCheckIn?.isCheckedIn ?? false;
        
        // Only update metrics if the ticket wasn't already checked in
        if (wasAlreadyCheckedIn) return old;

        const newCheckedInCount = old.checkedInCount + 1;
        const newNotCheckedInCount = old.notCheckedInCount - 1;
        const newCheckInPercentage =
          old.totalTickets > 0
            ? (newCheckedInCount / old.totalTickets) * 100
            : 0;

        return {
          ...old,
          checkedInCount: newCheckedInCount,
          notCheckedInCount: newNotCheckedInCount,
          checkInPercentage: newCheckInPercentage,
          recentCheckIns: [
            {
              ticketNumber: input.ticketNumber,
              name: ticketToCheckIn?.attendeeName ?? ticketToCheckIn?.buyerName ?? "Unknown",
              checkedInAt: new Date(),
            },
            ...old.recentCheckIns.slice(0, 4), // Keep only the 5 most recent
          ],
        };
      });

      return { previousData, previousMetrics };
    },
    onError: (err, input, context) => {
      // Rollback optimistic updates on error
      if (context?.previousData) {
        utils.checkIn.listAttendees.setData(
          {
            eventId,
            filter: currentFilter,
            search: currentSearch,
            page: currentPage,
          },
          context.previousData,
        );
      }
      if (context?.previousMetrics) {
        utils.checkIn.getMetrics.setData({ eventId }, context.previousMetrics);
      }
      setCheckingInTicketId(null);
    },
    onSuccess: () => {
      // Invalidate queries to ensure data consistency
      void utils.checkIn.listAttendees.invalidate({ eventId });
      void utils.checkIn.getMetrics.invalidate({ eventId });
      setCheckingInTicketId(null);
    },
  });

  /**
   * Check in an attendee by ticket number
   * @param ticketNumber - The ticket number to check in
   * @param callbacks - Optional success/error callbacks
   */
  const checkIn = (ticketNumber: string, callbacks?: CheckInCallbacks) => {
    return checkInMutation.mutateAsync(
      { eventId, ticketNumber },
    ).then((data) => {
      callbacks?.onSuccess?.();
      return data;
    }).catch((error) => {
      callbacks?.onError?.(error as Error);
      throw error;
    });
  };

  /**
   * Check in an attendee via QR code data
   * @param qrCodeData - The QR code data to check in
   * @param callbacks - Optional success/error callbacks
   */
  const checkInByQrCode = (
    qrCodeData: string,
    callbacks?: CheckInCallbacks,
  ) => {
    return checkInMutation.mutateAsync(
      { eventId, qrCodeData },
    ).then((data) => {
      callbacks?.onSuccess?.();
      return data;
    }).catch((error) => {
      callbacks?.onError?.(error as Error);
      throw error;
    });
  };

  return {
    checkIn,
    checkInByQrCode,
    isCheckingIn: checkInMutation.isPending,
    checkingInTicketId,
    error: checkInMutation.error,
  };
}
