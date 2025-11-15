"use client";

/**
 * ValidationStep Component
 * Third step: Validate data before import
 */

import { useEffect, useState } from "react";
import {
  Button,
  Label,
  Select,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Badge,
} from "flowbite-react";
import {
  HiCheckCircle,
  HiExclamationCircle,
  HiRefresh,
  HiDownload,
} from "react-icons/hi";
import { api } from "@/trpc/react";
import type { ParsedCSVData, ValidationResult } from "./import-wizard";

interface ValidationStepProps {
  eventId: string;
  parsedData: ParsedCSVData;
  fieldMapping: Record<string, string>;
  onComplete: (result: ValidationResult, strategy: "skip" | "create") => void;
  onBack: () => void;
}

export function ValidationStep({
  eventId,
  parsedData,
  fieldMapping,
  onComplete,
  onBack,
}: ValidationStepProps) {
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "create">(
    "skip"
  );
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);

  const validateImport = api.attendees.validateImport.useMutation({
    onSuccess: (result) => {
      setValidationResult(result);
    },
  });

  // Run validation on mount
  useEffect(() => {
    validateImport.mutate({
      eventId,
      fileContent: parsedData.fileContent,
      fieldMapping,
      duplicateStrategy,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRevalidate = () => {
    validateImport.mutate({
      eventId,
      fileContent: parsedData.fileContent,
      fieldMapping,
      duplicateStrategy,
    });
  };

  const handleDownloadErrorReport = () => {
    if (!validationResult || validationResult.errors.length === 0) return;

    // Generate CSV with errors
    const headers = ["Row", "Field", "Value", "Error"];
    const rows = validationResult.errors.map((error) => [
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
    a.download = `import-errors-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleNext = () => {
    if (!validationResult) return;
    onComplete(validationResult, duplicateStrategy);
  };

  const hasErrors = validationResult && validationResult.invalidRows > 0;
  const hasDuplicates = validationResult && validationResult.duplicates > 0;
  const canProceed = validationResult && validationResult.validRows > 0;

  return (
    <div className="space-y-6">
      {/* Loading state */}
      {validateImport.isPending && (
        <Alert color="info" icon={HiRefresh}>
          <span className="font-medium">Validating data...</span> This may take
          a moment for large files.
        </Alert>
      )}

      {/* Validation summary */}
      {validationResult && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Valid rows */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <div className="flex items-center gap-2">
                <HiCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-800 dark:text-green-300">
                  Valid Rows
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-green-900 dark:text-green-200">
                {validationResult.validRows}
              </p>
            </div>

            {/* Invalid rows */}
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center gap-2">
                <HiExclamationCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-800 dark:text-red-300">
                  Invalid Rows
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-red-900 dark:text-red-200">
                {validationResult.invalidRows}
              </p>
            </div>

            {/* Duplicates */}
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <div className="flex items-center gap-2">
                <HiRefresh className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Duplicates
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-yellow-900 dark:text-yellow-200">
                {validationResult.duplicates}
              </p>
            </div>
          </div>

          {/* Import summary message */}
          <Alert
            color={hasErrors ? "warning" : "success"}
            icon={hasErrors ? HiExclamationCircle : HiCheckCircle}
          >
            {hasErrors ? (
              <span>
                <span className="font-medium">
                  {validationResult.validRows} valid rows will be imported.
                </span>{" "}
                {validationResult.invalidRows} invalid rows will be skipped.
              </span>
            ) : (
              <span>
                <span className="font-medium">All rows are valid!</span> Ready to
                import {validationResult.validRows} attendees.
              </span>
            )}
          </Alert>

          {/* Duplicate handling strategy */}
          {hasDuplicates && (
            <div className="space-y-2">
              <Label htmlFor="duplicate-strategy">
                Duplicate Handling Strategy
              </Label>
              <Select
                id="duplicate-strategy"
                value={duplicateStrategy}
                onChange={(e) =>
                  setDuplicateStrategy(e.target.value as "skip" | "create")
                }
              >
                <option value="skip">
                  Skip duplicates (recommended) - Don't import duplicate emails
                </option>
                <option value="create">
                  Create duplicates - Import all rows even if email exists
                </option>
              </Select>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Duplicates are detected by email + event combination. Choose how
                to handle them.
              </p>
            </div>
          )}

          {/* Error details table */}
          {hasErrors && validationResult.errors.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Validation Errors
                </h3>
                <Button size="sm" color="light" onClick={handleDownloadErrorReport}>
                  <HiDownload className="mr-2 h-4 w-4" />
                  Download Error Report
                </Button>
              </div>

              <div className="max-h-96 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <Table>
                  <TableHead>
                    <TableHeadCell>Row</TableHeadCell>
                    <TableHeadCell>Field</TableHeadCell>
                    <TableHeadCell>Value</TableHeadCell>
                    <TableHeadCell>Error</TableHeadCell>
                  </TableHead>
                  <TableBody className="divide-y">
                    {validationResult.errors
                      .slice(0, 50)
                      .map((error, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {error.row}
                          </TableCell>
                          <TableCell>
                            <Badge color="gray">{error.field}</Badge>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs">
                              {error.value.length > 50
                                ? `${error.value.substring(0, 50)}...`
                                : error.value}
                            </code>
                          </TableCell>
                          <TableCell className="text-red-600 dark:text-red-400">
                            {error.error}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
                {validationResult.errors.length > 50 && (
                  <div className="border-t border-gray-200 bg-gray-50 p-3 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                    Showing first 50 errors. Download full report to see all{" "}
                    {validationResult.errors.length} errors.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No errors message */}
          {!hasErrors && (
            <Alert color="success" icon={HiCheckCircle}>
              <span className="font-medium">
                No validation errors found!
              </span>{" "}
              All rows passed validation checks and are ready to import.
            </Alert>
          )}

          {/* Cannot proceed warning */}
          {!canProceed && (
            <Alert color="failure">
              <span className="font-medium">Cannot proceed with import.</span> All
              rows have validation errors. Please fix the errors in your CSV file
              and try again.
            </Alert>
          )}
        </>
      )}

      {/* Error state */}
      {validateImport.isError && (
        <Alert color="failure">
          <span className="font-medium">Validation failed:</span>{" "}
          {validateImport.error.message}
        </Alert>
      )}

      {/* Action buttons */}
      <div className="flex justify-between">
        <Button color="gray" onClick={onBack} disabled={validateImport.isPending}>
          Back
        </Button>
        <div className="flex gap-3">
          {validationResult && (
            <Button
              color="light"
              onClick={handleRevalidate}
              disabled={validateImport.isPending}
            >
              <HiRefresh className="mr-2 h-4 w-4" />
              Re-validate
            </Button>
          )}
          <Button
            color="blue"
            onClick={handleNext}
            disabled={!canProceed || validateImport.isPending}
          >
            Import {validationResult?.validRows || 0} Attendees
          </Button>
        </div>
      </div>
    </div>
  );
}
