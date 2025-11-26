/**
 * Mode Toggle Component
 * Client component for switching between Quick Mode and Dashboard Mode
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "flowbite-react";
import { HiQrcode, HiViewGrid } from "react-icons/hi";

interface ModeToggleProps {
  eventSlug: string;
}

export function ModeToggle({ eventSlug }: ModeToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentMode = searchParams.get("mode") ?? "quick";

  const handleModeChange = (mode: "quick" | "dashboard") => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (mode === "dashboard") {
      params.set("mode", mode);
    } else {
      params.delete("mode");
    }
    
    router.push(`/events/${eventSlug}/check-in?${params.toString()}`, {
      scroll: false,
    });
  };

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800 gap-1">
      <Button
        size="sm"
        color={currentMode === "quick" ? "blue" : "alternative"}
        onClick={() => handleModeChange("quick")}
        className="flex items-center gap-2"
      >
        <HiQrcode className="h-4 w-4" />
        <span className="hidden sm:inline">Quick Mode</span>
        <span className="sm:hidden">Quick</span>
      </Button>
      <Button
        size="sm"
        color={currentMode === "dashboard" ? "blue" : "alternative"}
        onClick={() => handleModeChange("dashboard")}
        className="flex items-center gap-2"
      >
        <HiViewGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Dashboard</span>
        <span className="sm:hidden">Dash</span>
      </Button>
    </div>
  );
}
