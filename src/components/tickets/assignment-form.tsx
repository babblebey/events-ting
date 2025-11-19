"use client";

/**
 * AssignmentForm Component
 * Form for assigning a ticket to an attendee with custom field support
 */

import { useState } from "react";
import { Button, Label, TextInput, Textarea, Checkbox, Alert } from "flowbite-react";
import { FormField, FormError } from "@/components/ui/form-field";
import { api } from "@/trpc/react";
import { HiCheckCircle, HiExclamationCircle, HiClock } from "react-icons/hi";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "@/server/api/root";
import type { CustomFieldDefinition, CustomFieldValue } from "@/lib/validators";
import { sanitizeCustomFieldResponses } from "@/lib/validators";
import { formatDate } from "@/lib/utils/date";

interface AssignmentFormProps {
  ticketId: string;
  ticketNumber: string;
  expectedUpdatedAt: Date;
  customFields?: CustomFieldDefinition[];
  eventName?: string;
  eventStartDate?: Date;
  assignmentCutoffType?: string;
  assignmentCutoffTime?: Date | null;
  timezone?: string;
  onSuccess?: (attendeeId: string) => void;
  onCancel?: () => void;
}

export function AssignmentForm({
  ticketId,
  ticketNumber,
  expectedUpdatedAt,
  customFields = [],
  eventName,
  eventStartDate,
  assignmentCutoffType,
  assignmentCutoffTime,
  timezone = "UTC",
  onSuccess,
  onCancel,
}: AssignmentFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [customData, setCustomData] = useState<Record<string, CustomFieldValue>>({});
  const [buyerConsent, setBuyerConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailWarning, setEmailWarning] = useState<string | null>(null);

  // Calculate assignment cutoff time for display
  const getAssignmentCutoffDisplay = (): { date: Date; label: string } | null => {
    if (!eventStartDate) return null;

    switch (assignmentCutoffType) {
      case "event_start":
        return {
          date: eventStartDate,
          label: "Event start time",
        };
      case "1h_before":
        return {
          date: new Date(eventStartDate.getTime() - 60 * 60 * 1000),
          label: "1 hour before event",
        };
      case "24h_before":
        return {
          date: new Date(eventStartDate.getTime() - 24 * 60 * 60 * 1000),
          label: "24 hours before event",
        };
      case "custom":
        return assignmentCutoffTime
          ? {
              date: assignmentCutoffTime,
              label: "Custom deadline",
            }
          : null;
      default:
        return {
          date: eventStartDate,
          label: "Event start time",
        };
    }
  };

  const cutoffDisplay = getAssignmentCutoffDisplay();

   
  const assignMutation = api.tickets.assign.useMutation({
    onSuccess: (data) => {
       
      if (onSuccess && data?.attendee?.id) {
         
        onSuccess(data.attendee.id);
      }
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      const errorCode = error?.data?.code;
      if (errorCode === "CONFLICT") {
        setErrors({
          general:
            "This ticket was just modified by someone else. Please refresh the page and try again.",
        });
      } else if (errorCode === "BAD_REQUEST") {
        setErrors({ general: error?.message ?? "Invalid request" });
      } else {
        setErrors({
          general: "An unexpected error occurred. Please try again.",
        });
      }
    },
  });

  // Email validation with soft warnings for common typos
  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address";
    }

    // Check for common typos
    const commonTypos = [
      { wrong: "@gmial.com", correct: "@gmail.com" },
      { wrong: "@gmai.com", correct: "@gmail.com" },
      { wrong: "@yahooo.com", correct: "@yahoo.com" },
      { wrong: "@hotmial.com", correct: "@hotmail.com" },
      { wrong: "@outlok.com", correct: "@outlook.com" },
    ];

    for (const typo of commonTypos) {
      if (value.toLowerCase().includes(typo.wrong)) {
        setEmailWarning(`Did you mean ${value.replace(new RegExp(typo.wrong, "i"), typo.correct)}?`);
        return;
      }
    }

    setEmailWarning(null);
    return;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    const error = validateEmail(value);
    if (error) {
      setErrors((prev) => ({ ...prev, email: error }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
    }
  };

  const handleCustomFieldChange = (fieldId: string, value: CustomFieldValue) => {
    setCustomData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));

    // Clear error for this field
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!name.trim()) {
      newErrors.name = "Attendee name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Attendee email is required";
    } else {
      const emailError = validateEmail(email);
      if (emailError) {
        newErrors.email = emailError;
      }
    }

    // Custom field validation
    customFields.forEach((field) => {
      if (field.required && !customData[field.id]) {
        newErrors[field.id] = `${field.label} is required`;
      }
    });

    // Buyer consent validation (FR-018 placeholder)
    if (!buyerConsent) {
      newErrors.buyerConsent =
        "You must confirm that you have permission to share this attendee's information";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Sanitize custom field responses (trim strings, remove empty values)
    const sanitizedCustomData = sanitizeCustomFieldResponses(customData);

    try {
       
      await assignMutation.mutateAsync({
        ticketId,
        attendee: {
          name: name.trim(),
          email: email.trim(),
          customData: Object.keys(sanitizedCustomData).length > 0 ? sanitizedCustomData : undefined,
        },
        expectedUpdatedAt,
      });
    } catch {
      // Error handled by onError callback
    }
  };

  const renderCustomField = (field: CustomFieldDefinition) => {
    const value = customData[field.id];

    switch (field.type) {
      case "text":
        return (
          <FormField
            key={field.id}
            label={field.label}
            name={field.id}
            type="text"
            required={field.required}
            value={(value as string) ?? ""}
            onChange={(e) =>
              handleCustomFieldChange(field.id, e.currentTarget.value)
            }
            error={errors[field.id]}
            helpText={field.helpText}
            placeholder={field.placeholder}
          />
        );

      case "textarea":
        return (
          <div key={field.id} className="mb-4">
            <div className="mb-2 block">
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="ml-1 text-red-500">*</span>}
              </Label>
            </div>
            <Textarea
              id={field.id}
              name={field.id}
              value={(value as string) ?? ""}
              onChange={(e) =>
                handleCustomFieldChange(field.id, e.currentTarget.value)
              }
              rows={4}
              color={errors[field.id] ? "failure" : undefined}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
            />
            {(errors[field.id] ?? field.helpText) && (
              <p
                className={`mt-2 text-sm ${errors[field.id] ? "text-red-600 dark:text-red-500" : "text-gray-500 dark:text-gray-400"}`}
              >
                {errors[field.id] ?? field.helpText}
              </p>
            )}
          </div>
        );

      case "select":
        return (
          <div key={field.id} className="mb-4">
            <div className="mb-2 block">
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="ml-1 text-red-500">*</span>}
              </Label>
            </div>
            <select
              id={field.id}
              name={field.id}
              value={(value as string) ?? ""}
              onChange={(e) =>
                handleCustomFieldChange(field.id, e.currentTarget.value)
              }
              className={`block w-full rounded-lg border ${errors[field.id] ? "border-red-500" : "border-gray-300"} bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white`}
            >
              <option value="">Select an option</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {(errors[field.id] ?? field.helpText) && (
              <p
                className={`mt-2 text-sm ${errors[field.id] ? "text-red-600 dark:text-red-500" : "text-gray-500 dark:text-gray-400"}`}
              >
                {errors[field.id] ?? field.helpText}
              </p>
            )}
          </div>
        );

      case "checkbox":
        // For checkbox type, support multi-select with options array
        if (field.options && field.options.length > 0) {
          const selectedValues = (value as string[]) ?? [];
          
          return (
            <div key={field.id} className="mb-4">
              <div className="mb-2 block">
                <Label>
                  {field.label}
                  {field.required && <span className="ml-1 text-red-500">*</span>}
                </Label>
              </div>
              <div className="space-y-2">
                {field.options.map((option) => (
                  <div key={option} className="flex items-center gap-2">
                    <Checkbox
                      id={`${field.id}-${option}`}
                      checked={selectedValues.includes(option)}
                      onChange={(e) => {
                        const newValues = e.currentTarget.checked
                          ? [...selectedValues, option]
                          : selectedValues.filter((v) => v !== option);
                        handleCustomFieldChange(field.id, newValues);
                      }}
                    />
                    <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                  </div>
                ))}
              </div>
              {(errors[field.id] ?? field.helpText) && (
                <p
                  className={`mt-2 text-sm ${errors[field.id] ? "text-red-600 dark:text-red-500" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {errors[field.id] ?? field.helpText}
                </p>
              )}
            </div>
          );
        }
        
        // Single checkbox (boolean value)
        return (
          <div key={field.id} className="mb-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id={field.id}
                checked={(value as boolean) ?? false}
                onChange={(e) =>
                  handleCustomFieldChange(field.id, e.currentTarget.checked)
                }
              />
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="ml-1 text-red-500">*</span>}
              </Label>
            </div>
            {(errors[field.id] ?? field.helpText) && (
              <p
                className={`mt-2 text-sm ${errors[field.id] ? "text-red-600 dark:text-red-500" : "text-gray-500 dark:text-gray-400"}`}
              >
                {errors[field.id] ?? field.helpText}
              </p>
            )}
          </div>
        );

      case "radio":
        return (
          <div key={field.id} className="mb-4">
            <div className="mb-2 block">
              <Label>
                {field.label}
                {field.required && <span className="ml-1 text-red-500">*</span>}
              </Label>
            </div>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <div key={option} className="flex items-center gap-2">
                  <input
                    type="radio"
                    id={`${field.id}-${option}`}
                    name={field.id}
                    value={option}
                    checked={value === option}
                    onChange={(e) =>
                      handleCustomFieldChange(field.id, e.currentTarget.value)
                    }
                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                </div>
              ))}
            </div>
            {(errors[field.id] ?? field.helpText) && (
              <p
                className={`mt-2 text-sm ${errors[field.id] ? "text-red-600 dark:text-red-500" : "text-gray-500 dark:text-gray-400"}`}
              >
                {errors[field.id] ?? field.helpText}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          Assign Ticket{eventName ? ` to ${eventName}` : ""}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Ticket Number: <span className="font-mono">{ticketNumber}</span>
        </p>
      </div>

      {/* Assignment Cutoff Time Display (UI only, no validation) */}
      {cutoffDisplay && (
        <Alert color="info" icon={HiClock}>
          <div className="text-sm">
            <p className="font-medium">Assignment Deadline</p>
            <p className="mt-1">
              You can assign or reassign this ticket until{" "}
              <strong>
                {formatDate(cutoffDisplay.date, timezone, "PPp")}
              </strong>{" "}
              ({cutoffDisplay.label})
            </p>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Note: Cutoff enforcement will be added in a future update. For now,
              this is informational only.
            </p>
          </div>
        </Alert>
      )}

      {/* General Errors */}
      {errors.general && <FormError message={errors.general} />}

      {/* Basic Attendee Information */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white">
          Attendee Information
        </h4>

        <FormField
          label="Full Name"
          name="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          error={errors.name}
          placeholder="John Doe"
        />

        <div className="mb-4">
          <div className="mb-2 block">
            <Label htmlFor="email">
              Email Address
              <span className="ml-1 text-red-500">*</span>
            </Label>
          </div>
          <TextInput
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => handleEmailChange(e.currentTarget.value)}
            color={errors.email ? "failure" : undefined}
            placeholder="john@example.com"
          />
          {errors.email && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-500">
              {errors.email}
            </p>
          )}
          {emailWarning && !errors.email && (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-gray-800 dark:text-yellow-300">
              <HiExclamationCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{emailWarning}</span>
            </div>
          )}
        </div>
      </div>

      {/* Custom Fields */}
      {customFields.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white">
            Additional Information
          </h4>
          {customFields.map(renderCustomField)}
        </div>
      )}

      {/* Buyer Consent (FR-018 Placeholder) */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <Checkbox
            id="buyerConsent"
            checked={buyerConsent}
            onChange={(e) => setBuyerConsent(e.currentTarget.checked)}
            color={errors.buyerConsent ? "failure" : undefined}
          />
          <div className="flex-1">
            <Label htmlFor="buyerConsent" className="font-medium">
              I confirm that I have permission from this attendee to share their
              information with the event organizer
              <span className="ml-1 text-red-500">*</span>
            </Label>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              By checking this box, you confirm that the attendee has consented
              to receive event-related communications and have their information
              processed according to the event&apos;s privacy policy.
            </p>
          </div>
        </div>
        {errors.buyerConsent && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-500">
            {errors.buyerConsent}
          </p>
        )}
      </div>

      {/* Note about attendee terms (FR-019 Placeholder) */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        <div className="flex items-start gap-2">
          <HiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              Next Step
            </p>
            <p className="mt-1">
              The attendee will receive an email with their ticket details and
              will be asked to accept the event terms and conditions when they
              view their ticket.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 border-t pt-4">
        {onCancel && (
          <Button
            type="button"
            color="gray"
            onClick={onCancel}
             
            disabled={assignMutation.isPending}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
           
          disabled={assignMutation.isPending}
          className="flex-1"
        >
          { }
          {assignMutation.isPending ? "Assigning..." : "Assign Ticket"}
        </Button>
      </div>
    </form>
  );
}
