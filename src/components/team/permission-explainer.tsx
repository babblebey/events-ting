/**
 * Permission Explainer Component
 *
 * Provides a clear explanation of what each module permission grants access to.
 * Helps collaborators understand their role and access level.
 *
 * @module components/team/permission-explainer
 */

"use client";

import { HiInformationCircle } from "react-icons/hi";

interface ModulePermission {
  name: string;
  label: string;
  description: string;
  capabilities: string[];
}

const MODULE_PERMISSIONS: ModulePermission[] = [
  {
    name: "OVERVIEW",
    label: "Overview",
    description: "Dashboard and event overview access",
    capabilities: [
      "View event dashboard",
      "See event summary statistics",
      "Access basic event information",
    ],
  },
  {
    name: "ATTENDEES",
    label: "Attendees",
    description: "Manage event attendees and registrations",
    capabilities: [
      "View attendee list",
      "Export attendee data",
      "Manage check-ins",
      "Send attendee communications",
    ],
  },
  {
    name: "TICKETS",
    label: "Tickets",
    description: "Manage ticket types and sales",
    capabilities: [
      "Create and edit ticket types",
      "View ticket sales and revenue",
      "Manage ticket inventory",
      "Issue refunds",
    ],
  },
  {
    name: "SCHEDULE",
    label: "Schedule",
    description: "Manage event schedule and sessions",
    capabilities: [
      "Create and edit sessions",
      "Manage session times and tracks",
      "Assign speakers to sessions",
      "Publish schedule changes",
    ],
  },
  {
    name: "SPEAKERS",
    label: "Speakers",
    description: "Manage event speakers and profiles",
    capabilities: [
      "Add and edit speaker profiles",
      "Upload speaker photos and bios",
      "Manage speaker assignments",
      "Contact speakers",
    ],
  },
  {
    name: "CFP",
    label: "Call for Papers",
    description: "Manage CFP submissions and reviews",
    capabilities: [
      "View all submissions",
      "Review and rate proposals",
      "Accept or reject submissions",
      "Communicate with submitters",
    ],
  },
  {
    name: "COMMUNICATIONS",
    label: "Communications",
    description: "Manage event communications and emails",
    capabilities: [
      "Create email campaigns",
      "Send announcements",
      "Manage templates",
      "View email analytics",
    ],
  },
  {
    name: "CHECKIN",
    label: "Check-In",
    description: "Process attendee check-ins at the event venue",
    capabilities: [
      "View attendee check-in list",
      "Check in attendees manually",
      "Scan QR codes for check-in",
      "Filter by check-in status",
    ],
  },
];

export function PermissionExplainer() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start gap-3">
        <HiInformationCircle className="mt-1 h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Understanding Module Permissions
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            As a team member, you may have access to specific modules.
            Here&apos;s what each module allows you to do:
          </p>
        </div>
      </div>

      {/* Permissions Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {MODULE_PERMISSIONS.map((module) => (
          <div
            key={module.name}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            {/* Module Header */}
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {module.label}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {module.description}
              </p>
            </div>

            {/* Capabilities List */}
            <ul className="space-y-1.5">
              {module.capabilities.map((capability, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" />
                  <span>{capability}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Owner Note */}
      <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <HiInformationCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-semibold">Event Owners</p>
            <p className="mt-1">
              Event owners have full access to all modules and additional
              capabilities including: team management, event settings, and
              billing controls.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
