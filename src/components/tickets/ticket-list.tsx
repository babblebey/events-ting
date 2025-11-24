"use client";

/**
 * TicketList Component
 * Displays a list of tickets with assignment status filtering and search
 */

import { useState, useMemo } from "react";
import { TextInput, Select, Button, Badge, Spinner } from "flowbite-react";
import { HiSearch, HiFilter } from "react-icons/hi";
import { TicketCard } from "./ticket-card";

interface Ticket {
  id: string;
  ticketNumber: string;
  isAssigned: boolean;
  assignedAt: Date | null;
  isCheckedIn: boolean;
  checkedInAt: Date | null;
  ticketType: {
    id: string;
    name: string;
    price: number;
  };
  attendee: {
    id: string;
    name: string;
    email: string;
    customData: Record<string, unknown> | null;
  } | null;
  createdAt: Date;
  updatedAt?: Date;
}

interface TicketListProps {
  tickets: Ticket[];
  loading?: boolean;
  eventSlug?: string;
  eventTimezone?: string;
  showActions?: boolean;
  onAssign?: (ticketId: string) => void;
  onReassign?: (ticketId: string) => void;
  onUnassign?: (ticketId: string) => void;
  onViewQR?: (ticketId: string) => void;
}

type AssignmentFilter = "all" | "assigned" | "unassigned";

export function TicketList({
  tickets,
  loading = false,
  eventSlug,
  eventTimezone = "UTC",
  showActions = false,
  onAssign,
  onReassign,
  onUnassign,
  onViewQR,
}: TicketListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [assignmentFilter, setAssignmentFilter] =
    useState<AssignmentFilter>("all");

  // Filter and search tickets
  const filteredTickets = useMemo(() => {
    let result = [...tickets];

    // Apply assignment filter
    if (assignmentFilter === "assigned") {
      result = result.filter((ticket) => ticket.isAssigned);
    } else if (assignmentFilter === "unassigned") {
      result = result.filter((ticket) => !ticket.isAssigned);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (ticket) =>
          ticket.ticketNumber.toLowerCase().includes(query) ||
          ticket.ticketType.name.toLowerCase().includes(query) ||
          (ticket.attendee?.name.toLowerCase().includes(query) ?? false) ||
          (ticket.attendee?.email.toLowerCase().includes(query) ?? false),
      );
    }

    return result;
  }, [tickets, assignmentFilter, searchQuery]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = tickets.length;
    const assigned = tickets.filter((t) => t.isAssigned).length;
    const unassigned = total - assigned;
    const checkedIn = tickets.filter((t) => t.isCheckedIn).length;

    return { total, assigned, unassigned, checkedIn };
  }, [tickets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          Loading tickets...
        </span>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-600 dark:text-gray-400">
          No tickets found for this registration.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Tickets
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.assigned}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Assigned
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.unassigned}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Unassigned
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.checkedIn}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Checked In
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 md:flex-row dark:border-gray-700 dark:bg-gray-800">
        {/* Search */}
        <div className="flex-1">
          <TextInput
            icon={HiSearch}
            placeholder="Search by ticket number, attendee name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Assignment Filter */}
        <div className="w-full md:w-48">
          <Select
            icon={HiFilter}
            value={assignmentFilter}
            onChange={(e) =>
              setAssignmentFilter(e.target.value as AssignmentFilter)
            }
          >
            <option value="all">All Tickets</option>
            <option value="assigned">Assigned Only</option>
            <option value="unassigned">Unassigned Only</option>
          </Select>
        </div>

        {/* Clear Filters */}
        {(searchQuery || assignmentFilter !== "all") && (
          <Button
            color="gray"
            onClick={() => {
              setSearchQuery("");
              setAssignmentFilter("all");
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredTickets.length} of {tickets.length} tickets
        </p>
        {filteredTickets.length !== tickets.length && (
          <Badge color="info">Filtered</Badge>
        )}
      </div>

      {/* Ticket Cards */}
      {filteredTickets.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-600 dark:text-gray-400">
            No tickets match your search criteria.
          </p>
          <Button
            color="gray"
            size="sm"
            className="mt-4"
            onClick={() => {
              setSearchQuery("");
              setAssignmentFilter("all");
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              eventSlug={eventSlug}
              eventTimezone={eventTimezone}
              showActions={showActions}
              onAssign={onAssign}
              onReassign={onReassign}
              onUnassign={onUnassign}
              onViewQR={onViewQR}
            />
          ))}
        </div>
      )}
    </div>
  );
}
