/**
 * My Teams List Component
 *
 * Displays all events where the current user is a team member.
 * Shows event details, user's role, and module permissions for each event.
 *
 * @module components/team/my-teams-list
 */

"use client";

import { Card, Badge, Button } from "flowbite-react";
import { RoleBadge } from "./role-badge";
import { formatDistanceToNow, format } from "date-fns";
import {
  HiCalendar,
  HiLocationMarker,
  HiExternalLink,
  HiClock,
} from "react-icons/hi";
import Link from "next/link";
import { MODULE_NAMES } from "@/lib/validators";

interface Membership {
  id: string;
  role: "OWNER" | "COLLABORATOR";
  modulePermissions: string[];
  invitedAt: Date;
  lastAccessedAt: Date | null;
  event: {
    id: string;
    name: string;
    slug: string;
    startDate: Date;
    endDate: Date;
    locationType: string;
    locationAddress: string | null;
    locationUrl: string | null;
    description: string;
  };
}

interface MyTeamsListProps {
  memberships: Membership[];
}

// Module display names with icons
const MODULE_DISPLAY: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  OVERVIEW: {
    label: "Overview",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
  },
  ATTENDEES: {
    label: "Attendees",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  TICKETS: {
    label: "Tickets",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  SCHEDULE: {
    label: "Schedule",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  SPEAKERS: {
    label: "Speakers",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  CFP: { label: "CFP", color: "text-pink-700", bgColor: "bg-pink-100" },
  COMMUNICATIONS: {
    label: "Communications",
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
  },
};

export function MyTeamsList({ memberships }: MyTeamsListProps) {
  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {memberships.length}{" "}
        {memberships.length === 1 ? "event" : "events"}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {memberships.map((membership) => (
          <TeamEventCard key={membership.id} membership={membership} />
        ))}
      </div>
    </div>
  );
}

function TeamEventCard({ membership }: { membership: Membership }) {
  const { event, role, modulePermissions, invitedAt, lastAccessedAt } =
    membership;

  // Format dates
  const eventDateText = `${format(new Date(event.startDate), "MMM d, yyyy")} - ${format(new Date(event.endDate), "MMM d, yyyy")}`;
  const invitedText = `Member since ${format(new Date(invitedAt), "MMM d, yyyy")}`;
  const lastAccessText = lastAccessedAt
    ? `Active ${formatDistanceToNow(new Date(lastAccessedAt), { addSuffix: true })}`
    : "Not yet accessed";

  // Location display
  const getLocationDisplay = () => {
    switch (event.locationType) {
      case "in-person":
        return event.locationAddress ?? "In-person";
      case "virtual":
        return "Virtual Event";
      case "hybrid":
        return "Hybrid Event";
      default:
        return "Location TBD";
    }
  };

  // Permission count (owner has all permissions)
  const permissionCount =
    role === "OWNER" ? MODULE_NAMES.length : modulePermissions.length;
  const totalModules = MODULE_NAMES.length;

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-lg">
      {/* Event Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="line-clamp-2 text-lg font-semibold text-gray-900 dark:text-white">
            {event.name}
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {invitedText}
          </p>
        </div>
        <div className="ml-2">
          <RoleBadge role={role} />
        </div>
      </div>

      {/* Event Details */}
      <div className="mb-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-start gap-2">
          <HiCalendar className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="line-clamp-1">{eventDateText}</span>
        </div>
        <div className="flex items-start gap-2">
          <HiLocationMarker className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="line-clamp-1">{getLocationDisplay()}</span>
        </div>
        <div className="flex items-start gap-2">
          <HiClock className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="line-clamp-1">{lastAccessText}</span>
        </div>
      </div>

      {/* Permissions Section */}
      <div className="mb-4 border-t pt-4 dark:border-gray-700">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Module Access
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {permissionCount}/{totalModules}
          </span>
        </div>

        {role === "OWNER" ? (
          <Badge color="success" className="w-full justify-center">
            Full Access (Owner)
          </Badge>
        ) : (
          <div className="flex flex-wrap gap-1">
            {modulePermissions.length === 0 ? (
              <span className="text-xs text-gray-500">No modules assigned</span>
            ) : (
              modulePermissions.slice(0, 3).map((module) => {
                const display = MODULE_DISPLAY[module] ?? {
                  label: module,
                  color: "text-gray-700",
                  bgColor: "bg-gray-100",
                };
                return (
                  <Badge
                    key={module}
                    color="gray"
                    className={`${display.bgColor} ${display.color} dark:${display.bgColor} dark:${display.color}`}
                  >
                    {display.label}
                  </Badge>
                );
              })
            )}
            {modulePermissions.length > 3 && (
              <Badge color="gray">+{modulePermissions.length - 3} more</Badge>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-auto flex gap-2">
        <Link href={`/${event.slug}`} className="flex-1">
          <Button color="blue" className="w-full" size="sm">
            <HiExternalLink className="mr-2 h-4 w-4" />
            View Event
          </Button>
        </Link>
      </div>
    </Card>
  );
}
