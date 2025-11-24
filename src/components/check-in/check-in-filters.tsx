"use client";

/**
 * CheckInFilters Component
 * Allows filtering attendees by check-in status
 * Implements URL state management for filter persistence
 */

import { Select } from "flowbite-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface CheckInFiltersProps {
  defaultValue?: "all" | "checked-in" | "not-checked-in";
}

export function CheckInFilters({ defaultValue = "all" }: CheckInFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (
    newFilter: "all" | "checked-in" | "not-checked-in",
  ) => {
    const params = new URLSearchParams(searchParams);

    if (newFilter !== "all") {
      params.set("filter", newFilter);
    } else {
      params.delete("filter");
    }

    // Reset to page 0 when filter changes
    params.delete("page");

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="w-full md:w-48">
      <Select
        id="filter"
        value={defaultValue}
        onChange={(e) =>
          handleFilterChange(
            e.target.value as "all" | "checked-in" | "not-checked-in",
          )
        }
        aria-label="Filter attendees by check-in status"
      >
        <option value="all">All Attendees</option>
        <option value="not-checked-in">Not Checked In</option>
        <option value="checked-in">Checked In</option>
      </Select>
    </div>
  );
}
