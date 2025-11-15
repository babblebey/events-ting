"use client";

/**
 * ImportProgressStep Component
 * Fourth step: Execute import and show progress
 */

import { useEffect, useState } from "react";
import { Button, Alert, Progress, Badge } from "flowbite-react";
import {
  HiCheckCircle,
  HiExclamationCircle,
  HiDownload,
  HiArrowLeft,
} from "react-icons/hi";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import type {
  ParsedCSVData,
  ValidationResult,
  ImportResult,
} from "./import-wizard";

interface ImportProgressStepProps {
  eventId: string;
  eventName: string;
  parsedData: ParsedCSVData;
  fieldMapping: Record<string, string>;
  duplicateStrategy: "skip" | "create";
  sendConfirmationEmails: boolean;
  validationResult: ValidationResult;
  onComplete: () => void;
}

export function ImportProgressStep({
  eventId,
  eventName,
  parsedData,
  fieldMapping,
  duplicateStrategy,
  sendConfirmationEmails,
  validationResult,
  onComplete,
}: ImportProgressStepProps) {
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const executeImport = api.attendees.executeImport.useMutation({
    onSuccess: (result) => {
      setImportResult(result);
      onComplete();

      // Invalidate attendees list to refresh data
      void utils.registration.list.invalidate({ eventId });

      // Show success toast notification
      if (result.status === "completed") {
        if (result.failureCount > 0) {
          // Partial success - show warning
          toast.warning(
            "Import Completed with Errors",
            `${result.successCount} attendees imported successfully, but ${result.failureCount} rows failed. Download the error report to fix and re-import.`,
            10000
          );
        } else {
          // Full success
          toast.success(
            "Import Completed Successfully",
            `${result.successCount} attendees imported. ${result.duplicateCount > 0 ? `${result.duplicateCount} duplicates skipped.` : ""}`,
            7000
          );
        }
      }
    },
    onError: (error) => {
      // Show error toast notification
      toast.error(
        "Import Failed",
        error.message || "An error occurred while importing attendees",
        7000
      );
    },
  });

  // Start import on mount
  useEffect(() => {
    executeImport.mutate({
      eventId,
      fileContent: parsedData.fileContent,
      fieldMapping,
      duplicateStrategy,
      sendConfirmationEmails,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownloadFailedRows = () => {
    if (!importResult || importResult.errors.length === 0) return;

    // Generate CSV with failed rows
    const headers = ["Row", "Field", "Value", "Error"];
    const rows = importResult.errors.map((error) => [
      error.row.toString(),
      error.field,
      error.value,
      error.error,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => `"${cell.replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-failed-rows-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackToAttendees = () => {
    router.push(`/${eventId}/attendees`);
  };

  const isImporting = executeImport.isPending;
  const isComplete = importResult !== null;
  const isSuccess = importResult?.status === "completed";

  return (
    <div className="space-y-6">
      {/* Importing state */}
      {isImporting && (
        <>
          <div className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Importing attendees...
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Processing {validationResult.validRows} valid rows
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Processing data</span>
              <span>Please wait...</span>
            </div>
            <Progress progress={0} color="blue" size="lg" />
          </div>

          <Alert color="info">
            <span className="font-medium">Please don't close this window.</span>{" "}
            The import process is running and will complete shortly.
          </Alert>
        </>
      )}

      {/* Success state */}
      {isComplete && isSuccess && importResult && (
        <>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <HiCheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Import Complete!
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Successfully imported attendees to {eventName}
            </p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Successful */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <div className="flex items-center gap-2">
                <HiCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-800 dark:text-green-300">
                  Successfully Imported
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-green-900 dark:text-green-200">
                {importResult.successCount}
              </p>
            </div>

            {/* Failed */}
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center gap-2">
                <HiExclamationCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-800 dark:text-red-300">
                  Failed
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-red-900 dark:text-red-200">
                {importResult.failureCount}
              </p>
            </div>

            {/* Skipped */}
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <div className="flex items-center gap-2">
                <HiExclamationCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Skipped (Duplicates)
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-yellow-900 dark:text-yellow-200">
                {importResult.duplicateCount}
              </p>
            </div>
          </div>

          {/* Success message */}
          <Alert color="success" icon={HiCheckCircle}>
            <div>
              <span className="font-medium">Import completed successfully!</span>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>
                  {importResult.successCount} attendees imported with unique
                  registration codes
                </li>
                {sendConfirmationEmails && (
                  <li>
                    Confirmation emails sent to all {importResult.successCount}{" "}
                    attendees
                  </li>
                )}
                {importResult.duplicateCount > 0 && (
                  <li>
                    {importResult.duplicateCount} duplicates skipped (already
                    registered)
                  </li>
                )}
              </ul>
            </div>
          </Alert>

          {/* Failed rows details */}
          {importResult.failureCount > 0 && importResult.errors.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Failed Rows ({importResult.failureCount})
                </h3>
                <Button
                  size="sm"
                  color="light"
                  onClick={handleDownloadFailedRows}
                >
                  <HiDownload className="mr-2 h-4 w-4" />
                  Download Failed Rows
                </Button>
              </div>

              <Alert color="warning">
                <span className="font-medium">
                  Some rows failed to import.
                </span>{" "}
                You can download the failed rows, fix the issues, and re-import
                them.
              </Alert>

              <div className="max-h-60 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {importResult.errors.slice(0, 10).map((error, index) => (
                    <div
                      key={index}
                      className="p-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex items-start gap-2">
                        <Badge color="failure">Row {error.row}</Badge>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {error.field}
                          </p>
                          <p className="text-gray-600 dark:text-gray-400">
                            {error.error}
                          </p>
                          <code className="mt-1 block rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">
                            {error.value}
                          </code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {importResult.errors.length > 10 && (
                  <div className="border-t border-gray-200 bg-gray-50 p-3 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                    Showing first 10 failed rows. Download full report to see all{" "}
                    {importResult.errors.length} failures.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Error state */}
      {executeImport.isError && (
        <>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <HiExclamationCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Import Failed
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              An error occurred while importing attendees
            </p>
          </div>

          <Alert color="failure">
            <span className="font-medium">Error:</span>{" "}
            {executeImport.error.message}
          </Alert>
        </>
      )}

      {/* Action buttons */}
      {isComplete && (
        <div className="flex justify-center gap-3">
          <Button color="blue" onClick={handleBackToAttendees}>
            <HiArrowLeft className="mr-2 h-4 w-4" />
            Back to Attendees
          </Button>
        </div>
      )}
    </div>
  );
}
