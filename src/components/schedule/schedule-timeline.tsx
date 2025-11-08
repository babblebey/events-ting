"use client";

/**
 * ScheduleTimeline Component
 * Chronological display of schedule entries with track filtering and color coding
 * FR-020: Display event schedule in timeline format
 * FR-025: Track support with visual indicators and filtering
 */

import { useState, useMemo } from "react";
import { Button } from "flowbite-react";
import { ScheduleCard } from "./schedule-card";
import { formatDate, extractDateString } from "@/lib/utils/date";
import { HiFilter } from "react-icons/hi";

interface ScheduleEntry {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string | null;
  track?: string | null;
  trackColor?: string | null;
  sessionType?: string | null;
  speakerSessions?: Array<{
    speaker: {
      id: string;
      name: string;
      photo?: string | null;
    };
    role?: string | null;
  }>;
}

interface Track {
  name: string;
  color: string;
}

interface ScheduleTimelineProps {
  entries: ScheduleEntry[];
  timezone: string;
  tracks?: Track[];
  onEdit?: (entryId: string) => void;
  onDelete?: (entryId: string) => void;
  showActions?: boolean;
}

export function ScheduleTimeline({
  entries,
  timezone,
  tracks = [],
  onEdit,
  onDelete,
  showActions = false,
}: ScheduleTimelineProps) {
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique tracks from entries if not provided
  const availableTracks = useMemo(() => {
    if (tracks.length > 0) return tracks;

    const trackMap = new Map<string, string>();
    entries.forEach((entry) => {
      if (entry.track) {
        trackMap.set(entry.track, entry.trackColor ?? "#6B7280");
      }
    });

    return Array.from(trackMap.entries()).map(([name, color]) => ({
      name,
      color,
    }));
  }, [entries, tracks]);

  // Filter entries by selected tracks
  const filteredEntries = useMemo(() => {
    if (selectedTracks.size === 0) return entries;

    return entries.filter((entry) => {
      if (!entry.track) return true; // Show trackless entries
      return selectedTracks.has(entry.track);
    });
  }, [entries, selectedTracks]);

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const groups = new Map<string, ScheduleEntry[]>();

    filteredEntries.forEach((entry) => {
      const dateKey = extractDateString(entry.startTime, timezone);
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(entry);
    });

    // Sort dates
    const sortedDates = Array.from(groups.keys()).sort();

    return sortedDates.map((date) => ({
      date,
      entries: groups.get(date)!.sort((a, b) => {
        // Sort by start time, then by track
        if (a.startTime < b.startTime) return -1;
        if (a.startTime > b.startTime) return 1;
        if (a.track && b.track) return a.track.localeCompare(b.track);
        return 0;
      }),
    }));
  }, [filteredEntries, timezone]);

  const toggleTrackFilter = (trackName: string) => {
    setSelectedTracks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(trackName)) {
        newSet.delete(trackName);
      } else {
        newSet.add(trackName);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setSelectedTracks(new Set());
  };

  const selectAllTracks = () => {
    setSelectedTracks(new Set(availableTracks.map((t) => t.name)));
  };

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="mt-2 text-gray-500 dark:text-gray-400">No schedule entries yet</p>
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
          Add your first session to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Track Filters */}
      {availableTracks.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HiFilter className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Filter by Track
              </h3>
            </div>

            <div className="flex gap-2">
              {selectedTracks.size > 0 && (
                <Button size="xs" color="gray" onClick={clearFilters}>
                  Clear
                </Button>
              )}
              <Button size="xs" color="light" onClick={selectAllTracks}>
                Select All
              </Button>
              <Button
                size="xs"
                color="light"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? "Hide" : "Show"}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-2">
              {availableTracks.map((track) => {
                const isSelected =
                  selectedTracks.size === 0 || selectedTracks.has(track.name);

                return (
                  <button
                    key={track.name}
                    onClick={() => toggleTrackFilter(track.name)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      isSelected
                        ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  >
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: track.color }}
                    />
                    {track.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Filter Summary */}
          {selectedTracks.size > 0 && !showFilters && (
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Showing {selectedTracks.size} of {availableTracks.length} tracks
            </div>
          )}
        </div>
      )}

      {/* Timeline by Date */}
      {entriesByDate.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            No entries match the selected filters
          </p>
          <Button size="sm" color="light" className="mt-3" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      ) : (
        entriesByDate.map(({ date, entries: dateEntries }) => (
          <div key={date} className="space-y-4">
            {/* Date Header */}
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 pb-2 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/80">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatDate(new Date(date + "T00:00:00Z"), timezone, "EEEE, MMMM d, yyyy")}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {dateEntries.length} session{dateEntries.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Entries for this date */}
            <div className="space-y-3">
              {dateEntries.map((entry) => (
                <ScheduleCard
                  key={entry.id}
                  entry={entry}
                  timezone={timezone}
                  onEdit={onEdit ? () => onEdit(entry.id) : undefined}
                  onDelete={onDelete ? () => onDelete(entry.id) : undefined}
                  showActions={showActions}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
