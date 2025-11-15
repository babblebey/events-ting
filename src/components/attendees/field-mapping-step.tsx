"use client";

/**
 * FieldMappingStep Component
 * Second step: Map CSV columns to system fields
 */

import { useState, useEffect } from "react";
import {
  Button,
  Label,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Alert,
} from "flowbite-react";
import { HiInformationCircle } from "react-icons/hi";
import type { ParsedCSVData } from "./import-wizard";

interface FieldMappingStepProps {
  eventId: string;
  parsedData: ParsedCSVData;
  initialMapping: Record<string, string>;
  onComplete: (mapping: Record<string, string>) => void;
  onBack: () => void;
}

const SYSTEM_FIELDS = [
  { value: "", label: "-- Do not import --" },
  { value: "name", label: "Name *", required: true },
  { value: "email", label: "Email *", required: true },
  { value: "ticketType", label: "Ticket Type *", required: true },
  { value: "paymentStatus", label: "Payment Status", required: false },
  { value: "emailStatus", label: "Email Status", required: false },
  { value: "registeredAt", label: "Registration Date", required: false },
];

const CUSTOM_FIELD_VALUE = "custom";

export function FieldMappingStep({
  eventId,
  parsedData,
  initialMapping,
  onComplete,
  onBack,
}: FieldMappingStepProps) {
  const [fieldMapping, setFieldMapping] =
    useState<Record<string, string>>(initialMapping);
  const [customFieldNames, setCustomFieldNames] = useState<
    Record<string, string>
  >({});
  const [errors, setErrors] = useState<string[]>([]);

  // Load saved mappings from localStorage
  useEffect(() => {
    const savedMapping = localStorage.getItem(
      `events-ting:import-mapping:${eventId}`
    );
    if (savedMapping && Object.keys(initialMapping).length === 0) {
      try {
        const parsed = JSON.parse(savedMapping) as {
          fieldMapping?: Record<string, string>;
          customFieldNames?: Record<string, string>;
        };
        setFieldMapping(parsed.fieldMapping ?? {});
        setCustomFieldNames(parsed.customFieldNames ?? {});
      } catch {
        // Ignore parsing errors
      }
    }
  }, [eventId, initialMapping]);

  const handleMappingChange = (csvColumn: string, systemField: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [csvColumn]: systemField,
    }));
    setErrors([]);
  };

  const handleCustomFieldNameChange = (csvColumn: string, name: string) => {
    setCustomFieldNames((prev) => ({
      ...prev,
      [csvColumn]: name,
    }));
  };

  const validateMapping = (): boolean => {
    const newErrors: string[] = [];

    // Check required fields are mapped
    const requiredFields = SYSTEM_FIELDS.filter((f) => f.required).map(
      (f) => f.value
    );
    const mappedSystemFields = Object.values(fieldMapping).filter(
      (v) => v && v !== CUSTOM_FIELD_VALUE
    );

    for (const required of requiredFields) {
      if (!mappedSystemFields.includes(required)) {
        const fieldLabel = SYSTEM_FIELDS.find((f) => f.value === required)?.label;
        newErrors.push(`Required field "${fieldLabel}" must be mapped`);
      }
    }

    // Check for duplicate mappings (except custom fields and empty)
    const nonEmptyMappings = Object.entries(fieldMapping).filter(
      ([, value]) => value && value !== CUSTOM_FIELD_VALUE
    );
    const seenFields = new Set<string>();

    for (const [, field] of nonEmptyMappings) {
      if (seenFields.has(field)) {
        newErrors.push(
          `Field "${field}" is mapped to multiple columns. Each system field can only be mapped once.`
        );
      }
      seenFields.add(field);
    }

    // Check custom field names are provided
    for (const [column, mapping] of Object.entries(fieldMapping)) {
      if (mapping === CUSTOM_FIELD_VALUE && !customFieldNames[column]) {
        newErrors.push(
          `Custom field name required for column "${column}"`
        );
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleNext = () => {
    if (!validateMapping()) {
      return;
    }

    // Save mapping to localStorage
    localStorage.setItem(
      `events-ting:import-mapping:${eventId}`,
      JSON.stringify({
        fieldMapping,
        customFieldNames,
      })
    );

    // Build final mapping with custom field names
    const finalMapping: Record<string, string> = {};
    for (const [column, mapping] of Object.entries(fieldMapping)) {
      if (mapping === CUSTOM_FIELD_VALUE) {
        finalMapping[column] = `custom_${customFieldNames[column]}`;
      } else if (mapping) {
        finalMapping[column] = mapping;
      }
    }

    onComplete(finalMapping);
  };

  return (
    <div className="space-y-6">
      {/* Info alert */}
      <Alert color="info" icon={HiInformationCircle}>
        <span className="font-medium">Map your CSV columns to system fields.</span>{" "}
        Required fields must be mapped. Additional columns can be stored as custom
        fields.
      </Alert>

      {/* File info */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium text-gray-900 dark:text-white">
            File:
          </span>{" "}
          {parsedData.totalRows} rows detected
        </p>
      </div>

      {/* Mapping table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHead>
            <TableHeadCell>CSV Column</TableHeadCell>
            <TableHeadCell>System Field</TableHeadCell>
            <TableHeadCell>Sample Data</TableHeadCell>
          </TableHead>
          <TableBody className="divide-y">
            {parsedData.columns.map((column) => {
              const sampleValue =
                parsedData.preview[0]?.[column] ?? "(empty)";
              const isCustomField =
                fieldMapping[column] === CUSTOM_FIELD_VALUE;

              return (
                <TableRow key={column}>
                  <TableCell className="font-medium">{column}</TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Select
                        value={fieldMapping[column] ?? ""}
                        onChange={(e) =>
                          handleMappingChange(column, e.target.value)
                        }
                        sizing="sm"
                      >
                        {SYSTEM_FIELDS.map((field) => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                          </option>
                        ))}
                        <option value={CUSTOM_FIELD_VALUE}>
                          Custom Field...
                        </option>
                      </Select>

                      {/* Custom field name input */}
                      {isCustomField && (
                        <div className="space-y-1">
                          <Label htmlFor={`custom-${column}`} className="text-xs">
                            Custom Field Name
                          </Label>
                          <input
                            id={`custom-${column}`}
                            type="text"
                            placeholder="e.g., company, role, dietary"
                            value={customFieldNames[column] ?? ""}
                            onChange={(e) =>
                              handleCustomFieldNameChange(column, e.target.value)
                            }
                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">
                      {sampleValue.length > 30
                        ? `${sampleValue.substring(0, 30)}...`
                        : sampleValue}
                    </code>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Required fields reminder */}
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
          ⚠️ Required Fields
        </p>
        <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
          The following fields must be mapped: Name, Email, Ticket Type
        </p>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <Alert color="failure">
          <div>
            <span className="font-medium">
              Please fix the following errors:
            </span>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </Alert>
      )}

      {/* Action buttons */}
      <div className="flex justify-between">
        <Button color="gray" onClick={onBack}>
          Back
        </Button>
        <Button color="blue" onClick={handleNext}>
          Next: Validate Data
        </Button>
      </div>
    </div>
  );
}
