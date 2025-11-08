"use client";

/**
 * AttendeeTable Component
 * Table for displaying and managing event attendees with debounced search
 */

import { useState } from "react";
import { Badge, Button, Table, TextInput } from "flowbite-react";
import { HiSearch, HiDownload, HiMail, HiTrash } from "react-icons/hi";
import { api } from "@/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";

interface AttendeeTableProps {
  eventId: string;
  onResendConfirmation?: (registrationId: string) => void;
  onCancelRegistration?: (registrationId: string) => void;
}

export function AttendeeTable({
  eventId,
  onResendConfirmation,
  onCancelRegistration,
}: AttendeeTableProps) {
  const [search, setSearch] = useState("");
  const [selectedTicketType, setSelectedTicketType] = useState<string | undefined>(undefined);

  // Debounce search input to reduce API calls
  const debouncedSearch = useDebounce(search, 500);

  // Fetch registrations with filters
  const { data, isLoading, fetchNextPage, hasNextPage, refetch } =
    api.registration.list.useInfiniteQuery(
      {
        eventId,
        limit: 50,
        search: debouncedSearch || undefined,
        ticketTypeId: selectedTicketType,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  // Fetch ticket types for filter
  const { data: ticketTypes } = api.ticket.list.useQuery({
    eventId,
    includeUnavailable: true,
  });

  // Export handler
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await api.registration.export.query({
        eventId,
        format: "csv",
      });
      
      // Download the CSV
      const link = document.createElement("a");
      link.href = data.url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const allRegistrations = data?.pages.flatMap((page) => page.items) ?? [];
  const totalCount = data?.pages[0]?.total ?? 0;

  const getEmailStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge color="success">Active</Badge>;
      case "bounced":
        return <Badge color="failure">Bounced</Badge>;
      case "unsubscribed":
        return <Badge color="gray">Unsubscribed</Badge>;
      default:
        return <Badge color="gray">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "free":
        return <Badge color="info">Free</Badge>;
      case "paid":
        return <Badge color="success">Paid</Badge>;
      case "pending":
        return <Badge color="warning">Pending</Badge>;
      case "failed":
        return <Badge color="failure">Failed</Badge>;
      case "refunded":
        return <Badge color="gray">Refunded</Badge>;
      default:
        return <Badge color="gray">{status}</Badge>;
    }
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

          {/* Ticket Type Filter */}
          {ticketTypes && ticketTypes.items.length > 0 && (
            <select
              value={selectedTicketType ?? ""}
              onChange={(e) => setSelectedTicketType(e.target.value || undefined)}
              className="rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900"
            >
              <option value="">All Ticket Types</option>
              {ticketTypes.items.map((ticket) => (
                <option key={ticket.id} value={ticket.id}>
                  {ticket.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Export Button */}
        <Button
          color="gray"
          onClick={handleExport}
          disabled={isExporting}
        >
          <HiDownload className="mr-2 h-5 w-5" />
          {isExporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {allRegistrations.length} of {totalCount} attendees
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table hoverable>
          <Table.Head>
            <Table.HeadCell>Name</Table.HeadCell>
            <Table.HeadCell>Email</Table.HeadCell>
            <Table.HeadCell>Ticket Type</Table.HeadCell>
            <Table.HeadCell>Payment</Table.HeadCell>
            <Table.HeadCell>Email Status</Table.HeadCell>
            <Table.HeadCell>Registered</Table.HeadCell>
            <Table.HeadCell>Actions</Table.HeadCell>
          </Table.Head>
          <Table.Body className="divide-y">
            {isLoading ? (
              <Table.Row>
                <Table.Cell colSpan={7} className="text-center">
                  Loading attendees...
                </Table.Cell>
              </Table.Row>
            ) : allRegistrations.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={7} className="text-center text-gray-500">
                  No attendees found
                </Table.Cell>
              </Table.Row>
            ) : (
              allRegistrations.map((registration) => (
                <Table.Row key={registration.id} className="bg-white">
                  <Table.Cell className="font-medium text-gray-900">
                    {registration.name}
                  </Table.Cell>
                  <Table.Cell>{registration.email}</Table.Cell>
                  <Table.Cell>
                    <Badge color="purple">{registration.ticketType.name}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {getPaymentStatusBadge(registration.paymentStatus)}
                  </Table.Cell>
                  <Table.Cell>
                    {getEmailStatusBadge(registration.emailStatus)}
                  </Table.Cell>
                  <Table.Cell>
                    {new Intl.DateTimeFormat("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(registration.registeredAt))}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-2">
                      {onResendConfirmation && (
                        <Button
                          size="xs"
                          color="gray"
                          onClick={() => onResendConfirmation(registration.id)}
                          title="Resend confirmation email"
                        >
                          <HiMail className="h-4 w-4" />
                        </Button>
                      )}
                      {onCancelRegistration && (
                        <Button
                          size="xs"
                          color="failure"
                          onClick={() => onCancelRegistration(registration.id)}
                          title="Cancel registration"
                        >
                          <HiTrash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>
      </div>

      {/* Load More */}
      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            color="gray"
            onClick={() => fetchNextPage()}
            disabled={isLoading}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
