"use client";

/**
 * SearchBar Component
 * Allows searching attendees by ticket number
 * Implements debounced search with URL state management
 */

import { useState, useEffect } from "react";
import { TextInput } from "flowbite-react";
import { HiSearch } from "react-icons/hi";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchBarProps {
  defaultValue?: string;
}

export function SearchBar({ defaultValue = "" }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(defaultValue);

  // Debounce search input to reduce URL updates
  const debouncedSearch = useDebounce(search, 500);

  // Update URL when debounced search changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);

    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }

    // Reset to page 0 when search changes
    params.delete("page");

    router.push(`${pathname}?${params.toString()}`);
  }, [debouncedSearch, pathname, router, searchParams]);

  return (
    <div className="w-full max-w-md">
      <TextInput
        id="search"
        type="text"
        icon={HiSearch}
        placeholder="Search by ticket number..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search attendees by ticket number"
      />
    </div>
  );
}
