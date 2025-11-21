"use client";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

/**
 * Attendee Export Form Component
 * Form with export options for attendee CSV export
 * Part of User Story 5: Buyer vs Attendee Communication (T074)
 */

import { useState } from "react";
import { Button, Card, Checkbox, Label, Select, Alert } from "flowbite-react";
import { HiDownload, HiInformationCircle } from "react-icons/hi";
import { api } from "@/trpc/react";

interface AttendeeExportFormProps {
  eventId: string;
  totalAttendees: number;
}

export function AttendeeExportForm({
  eventId,
  totalAttendees,
}: AttendeeExportFormProps) {
  // Export options state
  const [emailStatus, setEmailStatus] = useState<
    "active" | "bounced" | "unsubscribed" | undefined
  >(undefined);
  const [includeCustomFields, setIncludeCustomFields] = useState(true);
  const [includeCheckInStatus, setIncludeCheckInStatus] = useState(true);

  // Export mutation
  const exportMutation = api.attendees.exportList.useMutation({
    onSuccess: (data: { csv: string; filename: string }) => {
      // Create a blob and download the CSV
      const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => {
      console.error("Export failed:", error);
    },
  });

  const handleExport = () => {
    exportMutation.mutate({
      eventId,
      emailStatus,
      includeCustomFields,
      includeCheckInStatus,
    });
  };

  // Calculate estimated row count based on filters
  const getEstimatedRowCount = () => {
    if (emailStatus) {
      return "Filtered count will be determined at export";
    }
    return totalAttendees.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Export Options */}
      <Card>
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Export Options
        </h2>

        <div className="space-y-6">
          {/* Email Status Filter */}
          <div>
            <Label htmlFor="emailStatus" className="mb-2 block">
              Filter by Email Status
            </Label>
            <Select
              id="emailStatus"
              value={emailStatus ?? ""}
              onChange={(e) =>
                setEmailStatus(
                  e.target.value
                    ? (e.target.value as "active" | "bounced" | "unsubscribed")
                    : undefined,
                )
              }
            >
              <option value="">All Attendees</option>
              <option value="active">Active Email Only</option>
              <option value="bounced">Bounced Email Only</option>
              <option value="unsubscribed">Unsubscribed Only</option>
            </Select>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Filter attendees by their email delivery status. Select
              &quot;Active Email Only&quot; to exclude bounced or unsubscribed
              contacts.
            </p>
          </div>

          {/* Include Custom Fields */}
          <div className="flex items-start">
            <div className="flex h-5 items-center">
              <Checkbox
                id="includeCustomFields"
                checked={includeCustomFields}
                onChange={(e) => setIncludeCustomFields(e.target.checked)}
              />
            </div>
            <div className="ml-3">
              <Label htmlFor="includeCustomFields" className="font-medium">
                Include Custom Registration Fields
              </Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add columns for custom fields collected during ticket assignment
                (dietary restrictions, t-shirt size, etc.)
              </p>
            </div>
          </div>

          {/* Include Check-In Status */}
          <div className="flex items-start">
            <div className="flex h-5 items-center">
              <Checkbox
                id="includeCheckInStatus"
                checked={includeCheckInStatus}
                onChange={(e) => setIncludeCheckInStatus(e.target.checked)}
              />
            </div>
            <div className="ml-3">
              <Label htmlFor="includeCheckInStatus" className="font-medium">
                Include Check-In Status
              </Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add columns showing whether attendees have checked in and when
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Export Summary */}
      <Card>
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Export Summary
        </h2>

        <div className="space-y-3">
          <div className="flex justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Format:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              CSV (Comma-Separated Values)
            </span>
          </div>

          <div className="flex justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">
              Estimated Rows:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {getEstimatedRowCount()}
            </span>
          </div>

          <div className="flex justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">
              Email Filter:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {emailStatus ? `${emailStatus} only` : "All statuses"}
            </span>
          </div>

          <div className="flex justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">
              Custom Fields:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {includeCustomFields ? "Included" : "Excluded"}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Check-In Data:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {includeCheckInStatus ? "Included" : "Excluded"}
            </span>
          </div>
        </div>
      </Card>

      {/* Export Success/Error Messages */}
      {exportMutation.status === "success" && (
        <Alert color="success" icon={HiInformationCircle}>
          <span className="font-medium">Export successful!</span> Your CSV file
          has been downloaded. Check your Downloads folder.
        </Alert>
      )}

      {exportMutation.status === "error" && (
        <Alert color="failure" icon={HiInformationCircle}>
          <span className="font-medium">Export failed!</span>{" "}
          {exportMutation.error.message}
        </Alert>
      )}

      {/* Export Button */}
      <div className="flex justify-end gap-3">
        <Button
          color="blue"
          size="lg"
          onClick={handleExport}
          disabled={exportMutation.status === "pending" || totalAttendees === 0}
        >
          <HiDownload className="mr-2 h-5 w-5" />
          {exportMutation.status === "pending"
            ? "Exporting..."
            : `Export ${totalAttendees === 0 ? "Attendees" : `${totalAttendees.toLocaleString()} Attendee${totalAttendees === 1 ? "" : "s"}`}`}
        </Button>
      </div>

      {/* No Attendees Warning */}
      {totalAttendees === 0 && (
        <Alert color="warning" icon={HiInformationCircle}>
          <span className="font-medium">No attendees to export.</span> Attendees
          will appear once tickets are assigned.
        </Alert>
      )}
    </div>
  );
}
