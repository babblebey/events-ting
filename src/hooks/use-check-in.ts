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
      await utils.checkIn.listAttendees.cancel({
        eventId,
        filter: currentFilter,
        search: currentSearch,
        page: currentPage,
      });

      // Snapshot previous value for rollback
      const previousData = utils.checkIn.listAttendees.getData({
        eventId,
        filter: currentFilter,
        search: currentSearch,
        page: currentPage,
      });

      // Optimistically update the cache
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

      return { previousData };
    },
    onError: (err, input, context) => {
      // Rollback optimistic update on error
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
    checkInMutation.mutate(
      { eventId, ticketNumber },
      {
        onSuccess: callbacks?.onSuccess,
        onError: (error) => {
          if (callbacks?.onError) {
            callbacks.onError(error as Error);
          }
        },
      },
    );
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
    checkInMutation.mutate(
      { eventId, qrCodeData },
      {
        onSuccess: callbacks?.onSuccess,
        onError: (error) => {
          if (callbacks?.onError) {
            callbacks.onError(error as Error);
          }
        },
      },
    );
  };

  return {
    checkIn,
    checkInByQrCode,
    isCheckingIn: checkInMutation.isPending,
    checkingInTicketId,
    error: checkInMutation.error,
  };
}
