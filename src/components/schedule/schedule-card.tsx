"use client";

/**
 * ScheduleCard Component
 * Individual session display card with speakers, time, and track information
 * FR-020: Display schedule entries in timeline format
 * FR-025: Visual track indicators with colors
 */

import { Card, Badge } from "flowbite-react";
import { HiClock, HiLocationMarker, HiUsers } from "react-icons/hi";
import { formatTimeRange, calculateDuration } from "@/lib/utils/date";

interface Speaker {
  id: string;
  name: string;
  photo?: string | null;
}

interface ScheduleCardProps {
  entry: {
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
      speaker: Speaker;
      role?: string | null;
    }>;
  };
  timezone: string;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export function ScheduleCard({
  entry,
  timezone,
  onEdit,
  onDelete,
  showActions = false,
}: ScheduleCardProps) {
  const duration = calculateDuration(entry.startTime, entry.endTime);
  const timeRange = formatTimeRange(entry.startTime, entry.endTime, timezone);
  const speakers = entry.speakerSessions?.map((ss) => ss.speaker) ?? [];

  // Session type color mapping
  const sessionTypeColors: Record<string, string> = {
    keynote: "purple",
    talk: "blue",
    workshop: "green",
    break: "gray",
    networking: "yellow",
  };

  const sessionTypeColor = sessionTypeColors[entry.sessionType ?? "talk"] ?? "blue";

  return (
    <Card className="relative overflow-visible">
      {/* Track Indicator Bar */}
      {entry.track && (
        <div
          className="absolute left-0 top-0 h-full w-1 rounded-l-lg"
          style={{ backgroundColor: entry.trackColor ?? "#6B7280" }}
          title={`Track: ${entry.track}`}
        />
      )}

      <div className="space-y-3">
        {/* Header with Title and Session Type */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {entry.title}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {/* Session Type Badge */}
              {entry.sessionType && (
                <Badge color={sessionTypeColor}>
                  {entry.sessionType.charAt(0).toUpperCase() +
                    entry.sessionType.slice(1)}
                </Badge>
              )}

              {/* Track Badge */}
              {entry.track && (
                <Badge
                  color="light"
                  style={{
                    borderLeft: `4px solid ${entry.trackColor ?? "#6B7280"}`,
                  }}
                >
                  {entry.track}
                </Badge>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {showActions && (
            <div className="flex gap-2">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-500"
                  title="Edit entry"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              )}

              {onDelete && (
                <button
                  onClick={onDelete}
                  className="text-red-600 hover:text-red-700 dark:text-red-500"
                  title="Delete entry"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400">{entry.description}</p>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 gap-3 border-t border-gray-200 pt-3 dark:border-gray-700 sm:grid-cols-3">
          {/* Time */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <HiClock className="h-5 w-5 shrink-0" />
            <div>
              <div className="font-medium">{timeRange}</div>
              <div className="text-xs">{duration} minutes</div>
            </div>
          </div>

          {/* Location */}
          {entry.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <HiLocationMarker className="h-5 w-5 shrink-0" />
              <span>{entry.location}</span>
            </div>
          )}

          {/* Speakers */}
          {speakers.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <HiUsers className="h-5 w-5 shrink-0" />
              <div className="flex flex-wrap items-center gap-1">
                {speakers.map((speaker, idx) => (
                  <span key={speaker.id}>
                    {speaker.name}
                    {idx < speakers.length - 1 && ","}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Speaker Avatars */}
        {speakers.length > 0 && (
          <div className="flex -space-x-2 overflow-hidden pt-2">
            {speakers.slice(0, 5).map((speaker) => (
              <div
                key={speaker.id}
                className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-gray-800"
                title={speaker.name}
              >
                {speaker.photo ? (
                  <img
                    src={speaker.photo}
                    alt={speaker.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {speaker.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {speakers.length > 5 && (
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 ring-2 ring-white dark:bg-gray-700 dark:ring-gray-800">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  +{speakers.length - 5}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
