"use client";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */

/**
 * AttendeeList Component
 * Displays attendees with check-in status and actions
 * Supports pagination and real-time updates
 */

import { useState } from "react";
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import { HiCheck, HiClock } from "react-icons/hi";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

// Type definitions from contracts
type AttendeeItem = {
  ticketId: string;
  ticketNumber: string;
  isCheckedIn: boolean;
  checkedInAt: Date | null;
  checkedInBy: string | null;
  attendeeName: string | null;
  attendeeEmail: string | null;
  buyerName: string;
  buyerEmail: string;
  isAssigned: boolean;
};

type Pagination = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type ListAttendeesOutput = {
  attendees: AttendeeItem[];
  pagination: Pagination;
};

interface AttendeeListProps {
  eventId: string;
  eventSlug: string;
  initialData: ListAttendeesOutput;
  currentPage: number;
  currentFilter: "all" | "checked-in" | "not-checked-in";
  currentSearch?: string;
}

export function AttendeeList({
  eventId,
  eventSlug,
  initialData,
  currentPage,
  currentFilter,
  currentSearch,
}: AttendeeListProps) {
  const router = useRouter();
  const [checkingInTicketId, setCheckingInTicketId] = useState<string | null>(
    null,
  );

  // Use tRPC query with initial data
  const { data } = api.checkIn.listAttendees.useQuery(
    {
      eventId,
      filter: currentFilter,
      search: currentSearch,
      page: currentPage,
      pageSize: 50,
    },
    {
      initialData,
      refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
    },
  );

  const utils = api.useUtils();

  // Check-in mutation
  const checkInMutation = api.checkIn.checkInTicket.useMutation({
    onMutate: async (input) => {
      // Set loading state
      const ticketToCheckIn = data?.attendees.find(
        (a) => a.ticketNumber === input.ticketNumber,
      );
      if (ticketToCheckIn) {
        setCheckingInTicketId(ticketToCheckIn.ticketId);
      }

      // Cancel outgoing refetches
      await utils.checkIn.listAttendees.cancel({
        eventId,
        filter: currentFilter,
        search: currentSearch,
        page: currentPage,
      });

      // Snapshot previous value
      const previousData = utils.checkIn.listAttendees.getData({
        eventId,
        filter: currentFilter,
        search: currentSearch,
        page: currentPage,
      });

      // Optimistically update
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
      // Rollback on error
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
      // Invalidate queries to ensure consistency
      void utils.checkIn.listAttendees.invalidate({ eventId });
      void utils.checkIn.getMetrics.invalidate({ eventId });
      setCheckingInTicketId(null);
    },
  });

  const handleCheckIn = (ticketNumber: string) => {
    checkInMutation.mutate({ eventId, ticketNumber });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (currentFilter !== "all") params.set("filter", currentFilter);
    if (currentSearch) params.set("search", currentSearch);
    if (newPage > 0) params.set("page", newPage.toString());

    router.push(`/events/${eventSlug}/check-in?${params.toString()}`);
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return "—";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(date));
  };

  const attendees = data?.attendees ?? [];
  const pagination = data?.pagination ?? initialData.pagination;

  return (
    <div className="space-y-6">
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <Table>
          <TableHead>
            <TableHeadCell>Ticket Number</TableHeadCell>
            <TableHeadCell>Name</TableHeadCell>
            <TableHeadCell>Email</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell>Checked In At</TableHeadCell>
            <TableHeadCell>
              <span className="sr-only">Actions</span>
            </TableHeadCell>
          </TableHead>
          <TableBody className="divide-y">
            {attendees.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    No attendees found
                  </p>
                </TableCell>
              </TableRow>
            )}
            {attendees.map((attendee) => (
              <TableRow
                key={attendee.ticketId}
                className="bg-white dark:border-gray-700 dark:bg-gray-800"
              >
                <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                  {attendee.ticketNumber}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {attendee.attendeeName ?? attendee.buyerName}
                    </p>
                    {attendee.attendeeName && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Buyer: {attendee.buyerName}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {attendee.attendeeEmail ?? attendee.buyerEmail}
                </TableCell>
                <TableCell>
                  {attendee.isCheckedIn ? (
                    <Badge color="success" icon={HiCheck}>
                      Checked In
                    </Badge>
                  ) : (
                    <Badge color="warning" icon={HiClock}>
                      Not Checked In
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{formatDateTime(attendee.checkedInAt)}</TableCell>
                <TableCell>
                  {!attendee.isCheckedIn && (
                    <Button
                      size="xs"
                      color="success"
                      onClick={() => handleCheckIn(attendee.ticketNumber)}
                      disabled={checkingInTicketId === attendee.ticketId}
                    >
                      {checkingInTicketId === attendee.ticketId
                        ? "Checking In..."
                        : "Check In"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700 dark:text-gray-400">
            Showing{" "}
            <span className="font-medium">
              {pagination.page * pagination.pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(
                (pagination.page + 1) * pagination.pageSize,
                pagination.total,
              )}
            </span>{" "}
            of <span className="font-medium">{pagination.total}</span> results
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              color="gray"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 0}
            >
              Previous
            </Button>
            <Button
              size="sm"
              color="gray"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
