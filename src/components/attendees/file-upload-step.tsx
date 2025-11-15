"use client";

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

/**
 * FileUploadStep Component
 * First step: Upload CSV file with drag & drop
 */

import { useState, useCallback } from "react";
import { Button, Checkbox, Label, Alert } from "flowbite-react";
import { HiDownload, HiUpload, HiX } from "react-icons/hi";
import { useDropzone } from "react-dropzone";
import { api, type RouterOutputs } from "@/trpc/react";
import type { ParsedCSVData } from "./import-wizard";

interface FileUploadStepProps {
  eventId: string;
  eventName?: string; // Optional since it's not used in this component
  onComplete: (
    data: ParsedCSVData,
    sendEmails: boolean,
    suggestedMapping: Record<string, string>
  ) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function FileUploadStep({
  eventId,
  onComplete,
}: FileUploadStepProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [sendConfirmationEmails, setSendConfirmationEmails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseCSV = api.attendees.parseCSV.useMutation({
    onSuccess: (result: RouterOutputs["attendees"]["parseCSV"]) => {
      onComplete(
        {
          columns: result.columns,
          preview: result.preview,
          totalRows: result.totalRows,
          fileContent: fileContent!, // Pass the original file content
        },
        sendConfirmationEmails,
        result.suggestedMapping
      );
    },
    onError: (error: { message?: string }) => {
      setError(error.message ?? "Failed to parse CSV");
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    const file = acceptedFiles[0];

    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a CSV file (.csv)");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError("File exceeds 10MB limit. Please split into smaller files");
      return;
    }

    setSelectedFile(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileContent(null);
    setError(null);
  };

  const handleNext = async () => {
    if (!selectedFile) return;

    setError(null);

    try {
      // Read file as text (not base64)
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        setFileContent(text); // Store for later use
        await parseCSV.mutateAsync({
          eventId,
          fileContent: text,
        });
      };
      reader.onerror = () => {
        setError("Failed to read file. Please try again.");
      };
      reader.readAsText(selectedFile);
    } catch {
      setError("Failed to process file. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      {/* File upload area */}
      <div>
        <Label htmlFor="csv-upload" className="mb-2 block">
          Upload CSV File
        </Label>

        {!selectedFile ? (
          <div
            {...getRootProps()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
              isDragActive
                ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
                : "border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
            }`}
          >
            <input {...getInputProps()} id="csv-upload" />
            <HiUpload className="mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mb-2 text-center text-sm text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Click to upload</span> or drag and
              drop
            </p>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              CSV files only (max 10MB and 10,000 rows)
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                <HiUpload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <Button
              size="sm"
              color="gray"
              onClick={handleRemoveFile}
              disabled={parseCSV.isPending}
            >
              <HiX className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Download template button */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            Need a template?
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Download our CSV template with example data
          </p>
        </div>
        <Button
          as="a"
          href="/templates/attendees-import-template.csv"
          download
          color="light"
          size="sm"
        >
          <HiDownload className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>

      {/* Send confirmation emails checkbox */}
      <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <Checkbox
          id="send-emails"
          checked={sendConfirmationEmails}
          onChange={(e) => setSendConfirmationEmails(e.target.checked)}
        />
        <div>
          <Label htmlFor="send-emails" className="font-medium">
            Send confirmation emails to imported attendees
          </Label>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            When enabled, all successfully imported attendees will receive a
            registration confirmation email
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <Alert color="failure" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* File size limits info */}
      <div className="rounded-lg border border-gray-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
          📊 File Limits
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-yellow-700 dark:text-yellow-400">
          <li>Maximum file size: 10MB</li>
          <li>Maximum rows: 10,000</li>
          <li>Whichever limit is hit first will apply</li>
        </ul>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        <Button
          color="blue"
          onClick={handleNext}
          disabled={!selectedFile || parseCSV.isPending}
        >
          {parseCSV.isPending ? "Processing..." : "Next: Map Fields"}
        </Button>
      </div>
    </div>
  );
}
