/**
 * Status Filter Component
 * Provides tabs for filtering events by status (All, Draft, Published, Archived)
 * Phase 4: Status Filtering
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "flowbite-react";

type EventStatus = "all" | "draft" | "published" | "archived";

interface StatusFilterProps {
  statusCounts?: {
    all: number;
    draft: number;
    published: number;
    archived: number;
  };
  isLoading?: boolean;
}

interface FilterTab {
  label: string;
  value: EventStatus;
  color: "gray" | "warning" | "success" | "info";
}

const FILTER_TABS: FilterTab[] = [
  { label: "All", value: "all", color: "gray" },
  { label: "Draft", value: "draft", color: "warning" },
  { label: "Published", value: "published", color: "success" },
  { label: "Archived", value: "archived", color: "info" },
];

export function StatusFilter({ statusCounts, isLoading }: StatusFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFilter = (searchParams.get("status") as EventStatus) || "all";

  /**
   * Handle filter tab click
   * Updates URL query params and triggers re-fetch via Next.js navigation
   */
  const handleFilterChange = (status: EventStatus) => {
    // Don't change if already active
    if (status === activeFilter) return;

    const params = new URLSearchParams(searchParams.toString());
    
    if (status === "all") {
      // Remove status param for "All" filter
      params.delete("status");
    } else {
      params.set("status", status);
    }

    // Update URL (this will trigger page re-render with new searchParams)
    router.push(`/dashboard?${params.toString()}`, { scroll: false });
  };

  /**
   * Get the count for a specific filter
   */
  const getCount = (value: EventStatus): number | undefined => {
    if (!statusCounts) return undefined;
    return statusCounts[value];
  };

  return (
    <div className="mb-6">
      {/* Desktop: Horizontal tabs */}
      <div className="hidden gap-2 sm:flex">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.value;
          const count = getCount(tab.value);

          return (
            <button
              key={tab.value}
              onClick={() => handleFilterChange(tab.value)}
              disabled={isLoading}
              className={`
                flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
                transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60
                ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md hover:bg-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }
              `}
            >
              <span>{tab.label}</span>
              {count !== undefined && (
                <Badge
                  color={isActive ? "light" : tab.color}
                  size="sm"
                  className="ml-1"
                >
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile: Vertical stacked buttons */}
      <div className="flex flex-col gap-2 sm:hidden">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.value;
          const count = getCount(tab.value);

          return (
            <button
              key={tab.value}
              onClick={() => handleFilterChange(tab.value)}
              disabled={isLoading}
              className={`
                flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium
                transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60
                ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }
              `}
            >
              <span>{tab.label}</span>
              {count !== undefined && (
                <Badge
                  color={isActive ? "light" : tab.color}
                  size="sm"
                >
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading indicator during filter switch */}
      {isLoading && (
        <div className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </span>
        </div>
      )}
    </div>
  );
}
