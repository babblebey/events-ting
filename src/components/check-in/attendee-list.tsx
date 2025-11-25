"use client";

/* eslint-disable @typescript-eslint/no-unsafe-call */

/**
 * AttendeeList Component
 * Displays attendees with check-in status and actions
 * Supports pagination and real-time updates
 */

import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Spinner,
} from "flowbite-react";
import { HiCheck, HiClock } from "react-icons/hi";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useCheckIn } from "@/hooks/use-check-in";
import { useToast } from "@/hooks/use-toast";
import { AttendeeListSkeleton } from "./attendee-list-skeleton";
import { DuplicateCheckInModal } from "./duplicate-check-in-modal";
import { useState } from "react";
import { formatEventTime } from "@/lib/utils/date";

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
  eventTimezone: string;
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
  const { toast } = useToast();

  // State for duplicate check-in modal
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [pendingCheckIn, setPendingCheckIn] = useState<AttendeeItem | null>(
    null,
  );

  // Use tRPC query with initial data
  const { data, isLoading } = api.checkIn.listAttendees.useQuery(
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

  // Use check-in hook with optimistic updates
  const { checkIn, checkingInTicketId } = useCheckIn({
    eventId,
    currentFilter,
    currentPage,
    currentSearch,
  });

  const handleCheckIn = (ticketNumber: string, attendee?: AttendeeItem) => {
    // Check if attendee is already checked in
    if (attendee?.isCheckedIn) {
      setPendingCheckIn(attendee);
      setDuplicateModalOpen(true);
      return;
    }

    performCheckIn(ticketNumber);
  };

  const performCheckIn = (ticketNumber: string) => {
    checkIn(ticketNumber, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Attendee checked in successfully!",
          variant: "success",
        });
      },
      onError: (error) => {
        toast({
          title: "Check-in failed",
          description:
            error.message || "Unable to check in attendee. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handleConfirmDuplicateCheckIn = () => {
    if (pendingCheckIn) {
      performCheckIn(pendingCheckIn.ticketNumber);
      setPendingCheckIn(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (currentFilter !== "all") params.set("filter", currentFilter);
    if (currentSearch) params.set("search", currentSearch);
    if (newPage > 0) params.set("page", newPage.toString());

    router.push(`/events/${eventSlug}/check-in?${params.toString()}`);
  };

  const formatDateTime = (date: Date | null, timezone: string) => {
    if (!date) return "—";
    // Format in event timezone: "11/24/25, 2:30 PM EST"
    return formatEventTime(new Date(date), timezone, "M/d/yy, h:mm a zzz");
  };

  const attendees = data?.attendees ?? [];
  const pagination = data?.pagination ?? initialData.pagination;
  const eventTimezone = data?.eventTimezone ?? initialData.eventTimezone;

  // Show skeleton during initial load
  if (isLoading && !data) {
    return <AttendeeListSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Loading indicator for background refetches */}
      {isLoading && data && (
        <div
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20"
          role="status"
          aria-live="polite"
        >
          <Spinner size="sm" aria-hidden="true" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Refreshing data...
          </span>
        </div>
      )}

      {/* Table */}
      <div
        className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        role="region"
        aria-label="Attendee list"
      >
        <Table className="min-w-[640px]">
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
                <TableCell colSpan={6} className="py-8 text-center">
                  <p
                    className="text-gray-500 dark:text-gray-400"
                    role="status"
                    aria-live="polite"
                  >
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
                <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
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
                <TableCell>{formatDateTime(attendee.checkedInAt, eventTimezone)}</TableCell>
                <TableCell>
                  {!attendee.isCheckedIn ? (
                    <Button
                      size="xs"
                      color="success"
                      onClick={() =>
                        handleCheckIn(attendee.ticketNumber, attendee)
                      }
                      disabled={checkingInTicketId === attendee.ticketId}
                      aria-label={`Check in ${attendee.attendeeName ?? attendee.buyerName} with ticket ${attendee.ticketNumber}`}
                      aria-busy={checkingInTicketId === attendee.ticketId}
                    >
                      {checkingInTicketId === attendee.ticketId && (
                        <Spinner
                          size="sm"
                          className="mr-2"
                          aria-hidden="true"
                        />
                      )}
                      {checkingInTicketId === attendee.ticketId
                        ? "Checking In..."
                        : "Check In"}
                    </Button>
                  ) : (
                    <Button
                      size="xs"
                      color="warning"
                      onClick={() =>
                        handleCheckIn(attendee.ticketNumber, attendee)
                      }
                      disabled={checkingInTicketId === attendee.ticketId}
                      aria-label={`Re-check in ${attendee.attendeeName ?? attendee.buyerName} with ticket ${attendee.ticketNumber}`}
                      aria-busy={checkingInTicketId === attendee.ticketId}
                    >
                      {checkingInTicketId === attendee.ticketId && (
                        <Spinner
                          size="sm"
                          className="mr-2"
                          aria-hidden="true"
                        />
                      )}
                      {checkingInTicketId === attendee.ticketId
                        ? "Checking In..."
                        : "Check In Again"}
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
        <nav
          className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between"
          role="navigation"
          aria-label="Attendee list pagination"
        >
          <p
            className="text-xs text-gray-700 sm:text-sm dark:text-gray-400"
            role="status"
            aria-live="polite"
          >
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
              aria-label="Go to previous page"
            >
              Previous
            </Button>
            <Button
              size="sm"
              color="gray"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages - 1}
              aria-label="Go to next page"
            >
              Next
            </Button>
          </div>
        </nav>
      )}

      {/* Duplicate Check-In Warning Modal */}
      {pendingCheckIn && (
        <DuplicateCheckInModal
          isOpen={duplicateModalOpen}
          onClose={() => {
            setDuplicateModalOpen(false);
            setPendingCheckIn(null);
          }}
          onConfirm={handleConfirmDuplicateCheckIn}
          attendeeName={pendingCheckIn.attendeeName ?? pendingCheckIn.buyerName}
          ticketNumber={pendingCheckIn.ticketNumber}
          checkedInAt={pendingCheckIn.checkedInAt}
          checkedInBy={pendingCheckIn.checkedInBy}
        />
      )}
    </div>
  );
}
