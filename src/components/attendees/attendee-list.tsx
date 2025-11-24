"use client";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

/**
 * AttendeeList Component
 * Displays attendees (assigned tickets) with email status filtering
 * Part of User Story 5: Buyer vs Attendee Communication
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
  TextInput,
  Select,
} from "flowbite-react";
import { HiSearch, HiDownload, HiMail } from "react-icons/hi";
import { api } from "@/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";

interface AttendeeListProps {
  eventId: string;
}

export function AttendeeList({ eventId }: AttendeeListProps) {
  const [search, setSearch] = useState("");
  const [emailStatus, setEmailStatus] = useState<
    "active" | "bounced" | "unsubscribed" | undefined
  >(undefined);

  // Debounce search input to reduce API calls
  const debouncedSearch = useDebounce(search, 500);

  // Fetch attendees with filters
  const { data, isLoading, fetchNextPage, hasNextPage } =
    api.attendees.list.useInfiniteQuery(
      {
        eventId,
        limit: 50,
        search: debouncedSearch || undefined,
        emailStatus,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  // Export mutation
  const exportMutation = api.attendees.exportList.useMutation({
    onSuccess: (data: { csv: string; filename: string }) => {
      // Create a blob and download the CSV
      const blob = new Blob([data.csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => {
      console.error("Export failed:", error);
      alert(`Export failed: ${error.message}`);
    },
  });

  const handleExport = () => {
    exportMutation.mutate({
      eventId,
      emailStatus,
      includeCustomFields: true,
      includeCheckInStatus: true,
    });
  };

  const allAttendees = data?.pages.flatMap((page) => page.attendees) ?? [];
  const totalCount = data?.pages[0]?.total ?? 0;

  const getEmailStatusBadge = (
    status: "active" | "bounced" | "unsubscribed",
  ) => {
    switch (status) {
      case "active":
        return <Badge color="success">Active</Badge>;
      case "bounced":
        return <Badge color="failure">Bounced</Badge>;
      case "unsubscribed":
        return <Badge color="gray">Unsubscribed</Badge>;
    }
  };

  const getCheckInStatusBadge = (isCheckedIn: boolean) => {
    return isCheckedIn ? (
      <Badge color="success">Checked In</Badge>
    ) : (
      <Badge color="gray">Not Checked In</Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3">
          {/* Search */}
          <TextInput
            icon={HiSearch}
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />

          {/* Email Status Filter */}
          <Select
            value={emailStatus ?? ""}
            onChange={(e) =>
              setEmailStatus(
                e.target.value
                  ? (e.target.value as "active" | "bounced" | "unsubscribed")
                  : undefined,
              )
            }
            className="w-48"
          >
            <option value="">All Email Status</option>
            <option value="active">Active</option>
            <option value="bounced">Bounced</option>
            <option value="unsubscribed">Unsubscribed</option>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            color="gray"
            onClick={handleExport}
            disabled={exportMutation.status === "pending"}
          >
            <HiDownload className="mr-2 h-5 w-5" />
            {exportMutation.status === "pending"
              ? "Exporting..."
              : "Export CSV"}
          </Button>

          <Link href={`/${eventId}/communications`}>
            <Button color="blue">
              <HiMail className="mr-2 h-5 w-5" />
              Send Email
            </Button>
          </Link>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {allAttendees.length} of {totalCount} attendees
        {emailStatus && ` (filtered by ${emailStatus} email status)`}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table hoverable>
          <TableHead>
            <TableHeadCell>Name</TableHeadCell>
            <TableHeadCell>Email</TableHeadCell>
            <TableHeadCell>Ticket Number</TableHeadCell>
            <TableHeadCell>Ticket Type</TableHeadCell>
            <TableHeadCell>Email Status</TableHeadCell>
            <TableHeadCell>Check-In Status</TableHeadCell>
            <TableHeadCell>Actions</TableHeadCell>
          </TableHead>
          <TableBody className="divide-y">
            {isLoading ? (
              <TableRow className="bg-white dark:border-gray-700 dark:bg-gray-800">
                <TableCell colSpan={7} className="text-center">
                  Loading attendees...
                </TableCell>
              </TableRow>
            ) : allAttendees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-gray-500 dark:text-gray-400"
                >
                  {search || emailStatus
                    ? "No attendees found matching your filters"
                    : "No attendees yet. Attendees will appear here once tickets are assigned."}
                </TableCell>
              </TableRow>
            ) : (
              allAttendees.map((attendee) => (
                <TableRow
                  key={attendee.id}
                  className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                >
                  <TableCell className="font-medium text-gray-900 dark:text-white">
                    {attendee.name}
                  </TableCell>
                  <TableCell>{attendee.email}</TableCell>
                  <TableCell>
                    <Link
                      href={`/tickets/${attendee.ticket.id}`}
                      className="font-mono text-sm text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {attendee.ticket.ticketNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge color="purple">
                      {attendee.ticket.ticketType.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getEmailStatusBadge(attendee.emailStatus)}
                  </TableCell>
                  <TableCell>
                    {getCheckInStatusBadge(attendee.ticket.isCheckedIn)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/${eventId}/attendees/${attendee.id}`}>
                      <Button size="xs" color="gray">
                        View Details
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Load More */}
      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            color="gray"
            onClick={() => void fetchNextPage()}
            disabled={isLoading}
          >
            Load More
          </Button>
        </div>
      )}

      {/* Info Banner */}
      {allAttendees.length > 0 && (
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <p className="font-semibold">💡 About Attendees</p>
          <p className="mt-1">
            This list shows individual attendees who have been assigned tickets,
            not the original ticket buyers. Use the &quot;Send Email&quot;
            button to communicate directly with attendees.
          </p>
        </div>
      )}
    </div>
  );
}
