/**
 * Team Member List Component
 *
 * Displays a list of team members for an event with their roles,
 * permissions, and status. Includes filtering and sorting capabilities.
 *
 * @module components/team/team-member-list
 */

"use client";

import { useState, useMemo } from "react";
import { api } from "@/trpc/react";
import { TeamMemberCard } from "./team-member-card";
import { Spinner, Button, Select, Label, Pagination } from "flowbite-react";
import { HiFilter, HiRefresh } from "react-icons/hi";

interface TeamMemberListProps {
  eventId: string;
  isOwner: boolean;
}

type FilterOption = "ALL" | "ACTIVE" | "PENDING" | "REMOVED";
type SortOption = "role" | "recent" | "name" | "module";

const PAGE_SIZE = 20;

export function TeamMemberList({ eventId, isOwner }: TeamMemberListProps) {
  const [statusFilter, setStatusFilter] = useState<FilterOption>("ACTIVE");
  const [sortBy, setSortBy] = useState<SortOption>("role");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch team members - use explicit undefined for ALL filter
  const queryStatus = statusFilter === "ALL" ? undefined : statusFilter;
  
  const { data, isLoading, error, refetch } = api.team.getMembers.useQuery({
    eventId,
    status: queryStatus,
    page: currentPage,
    limit: PAGE_SIZE,
  }, {
    // Cache team members for 2 minutes since they don't change frequently
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    // Refetch when window regains focus to ensure fresh data
    refetchOnWindowFocus: true,
    // Don't refetch on reconnect since we already refetch on focus
    refetchOnReconnect: false,
  });

  const members = data?.members;
  const pagination = data?.pagination;

  // Reset to page 1 when filter changes
  const handleFilterChange = (newFilter: FilterOption) => {
    setStatusFilter(newFilter);
    setCurrentPage(1);
  };

  // Sort members based on selected option
  const sortedMembers = useMemo(() => {
    if (!members) return [];

    const membersCopy = [...members];

    switch (sortBy) {
      case "role":
        // OWNER first, then COLLABORATOR
        return membersCopy.sort((a, b) => {
          if (a.role === b.role) return 0;
          return a.role === "OWNER" ? -1 : 1;
        });

      case "recent":
        // Most recently invited first
        return membersCopy.sort((a, b) => {
          return new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime();
        });

      case "name":
        // Alphabetical by name/email
        return membersCopy.sort((a, b) => {
          const aName = a.user?.name ?? a.email;
          const bName = b.user?.name ?? b.email;
          return aName.localeCompare(bName);
        });

      case "module":
        // By number of modules (descending)
        return membersCopy.sort((a, b) => {
          return b.modulePermissions.length - a.modulePermissions.length;
        });

      default:
        return membersCopy;
    }
  }, [members, sortBy]);

  // Count members by status
  const memberCounts = useMemo(() => {
    if (!members) return { ALL: 0, ACTIVE: 0, PENDING: 0, REMOVED: 0 };

    return members.reduce(
      (acc, member) => {
        acc.ALL++;
        const status = member.status as "ACTIVE" | "PENDING" | "REMOVED";
        if (acc[status] !== undefined) {
          acc[status]++;
        }
        return acc;
      },
      { ALL: 0, ACTIVE: 0, PENDING: 0, REMOVED: 0 },
    );
  }, [members]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="xl" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          Loading team members...
        </span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-800 dark:text-red-400">
          Failed to load team members: {error.message}
        </p>
        <Button
          color="failure"
          size="sm"
          className="mt-4"
          onClick={() => void refetch()}
        >
          <HiRefresh className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  // Empty state
  if (!sortedMembers || sortedMembers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">
          {statusFilter === "ALL"
            ? "No team members found"
            : `No ${statusFilter.toLowerCase()} team members`}
        </p>
        {statusFilter !== "ALL" && (
          <Button
            color="gray"
            size="sm"
            className="mt-4"
            onClick={() => handleFilterChange("ALL")}
          >
            Show All Members
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Sorting */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        {/* Status Filter */}
        <div className="flex-1 w-full sm:w-auto">
          <div className="mb-2 block">
            <Label htmlFor="status-filter">Filter by Status</Label>
          </div>
          <Select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value as FilterOption)}
            icon={HiFilter}
          >
            <option value="ALL">All Members ({memberCounts.ALL})</option>
            <option value="ACTIVE">Active ({memberCounts.ACTIVE})</option>
            <option value="PENDING">Pending ({memberCounts.PENDING})</option>
            <option value="REMOVED">Removed ({memberCounts.REMOVED})</option>
          </Select>
        </div>

        {/* Sort By */}
        <div className="flex-1 w-full sm:w-auto">
          <div className="mb-2 block">
            <Label htmlFor="sort-by">Sort By</Label>
          </div>
          <Select
            id="sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="role">Role (Owner First)</option>
            <option value="recent">Recently Added</option>
            <option value="name">Name (A-Z)</option>
            <option value="module">Module Access</option>
          </Select>
        </div>

        {/* Refresh Button */}
        <Button
          color="gray"
          onClick={() => void refetch()}
          disabled={isLoading}
        >
          <HiRefresh className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Member Count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {sortedMembers.length} of {pagination?.totalCount ?? 0} {pagination?.totalCount === 1 ? "member" : "members"}
        {pagination && pagination.totalPages > 1 && (
          <span className="ml-2">
            (Page {pagination.page} of {pagination.totalPages})
          </span>
        )}
      </div>

      {/* Members List */}
      <div className="space-y-4">
        {sortedMembers.map((member) => (
          <TeamMemberCard
            key={member.id}
            member={member}
            isOwner={isOwner}
            eventId={eventId}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={setCurrentPage}
            showIcons
          />
        </div>
      )}
    </div>
  );
}
