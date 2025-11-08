/**
 * CfpForm Component
 * 
 * Form for opening and editing Call for Papers (CFP) settings.
 * Used by event organizers to configure CFP guidelines, deadline, and required fields.
 * 
 * @module components/cfp/cfp-form
 */

"use client";

import { useState } from "react";
import { Button, Label, Textarea, Checkbox } from "flowbite-react";
import { api } from "@/trpc/react";
import type { CallForPapers } from "generated/prisma";

interface CfpFormProps {
  eventId: string;
  existingCfp?: CallForPapers | null;
  onSuccess?: (cfp: CallForPapers) => void;
  onCancel?: () => void;
}

const REQUIRED_FIELD_OPTIONS = [
  { value: "bio", label: "Speaker Bio" },
  { value: "sessionFormat", label: "Session Format" },
  { value: "duration", label: "Duration" },
  { value: "photo", label: "Speaker Photo" },
] as const;

export function CfpForm({ eventId, existingCfp, onSuccess, onCancel }: CfpFormProps) {
  const [guidelines, setGuidelines] = useState(existingCfp?.guidelines ?? "");
  const [deadline, setDeadline] = useState(
    existingCfp?.deadline 
      ? new Date(existingCfp.deadline).toISOString().slice(0, 16) 
      : ""
  );
  const [requiredFields, setRequiredFields] = useState<string[]>(
    existingCfp?.requiredFields 
      ? (Array.isArray(existingCfp.requiredFields) 
          ? existingCfp.requiredFields as string[]
          : [])
      : ["bio", "sessionFormat", "duration"]
  );
  const [error, setError] = useState<string | null>(null);

  const openCfpMutation = api.cfp.open.useMutation({
    onSuccess: (data) => {
      onSuccess?.(data);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const updateCfpMutation = api.cfp.update.useMutation({
    onSuccess: (data) => {
      onSuccess?.(data);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!guidelines.trim()) {
      setError("Please provide submission guidelines");
      return;
    }

    if (!deadline) {
      setError("Please select a deadline");
      return;
    }

    const deadlineDate = new Date(deadline);
    if (deadlineDate <= new Date()) {
      setError("Deadline must be in the future");
      return;
    }

    if (existingCfp) {
      updateCfpMutation.mutate({
        cfpId: existingCfp.id,
        guidelines,
        deadline: deadlineDate,
        requiredFields: requiredFields as ("bio" | "sessionFormat" | "duration" | "photo")[],
      });
    } else {
      openCfpMutation.mutate({
        eventId,
        guidelines,
        deadline: deadlineDate,
        requiredFields: requiredFields as ("bio" | "sessionFormat" | "duration" | "photo")[],
      });
    }
  };

  const toggleRequiredField = (field: string) => {
    setRequiredFields((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : [...prev, field]
    );
  };

  const isLoading = openCfpMutation.isPending || updateCfpMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Guidelines */}
      <div>
        <Label htmlFor="guidelines" className="mb-2 block">
          Submission Guidelines <span className="text-red-600">*</span>
        </Label>
        <Textarea
          id="guidelines"
          value={guidelines}
          onChange={(e) => setGuidelines(e.target.value)}
          placeholder="Provide clear guidelines for speakers submitting proposals. Include topics, expectations, and any specific requirements..."
          rows={8}
          required
          disabled={isLoading}
          className="w-full"
        />
        <p className="mt-1 text-sm text-gray-500">
          Minimum 50 characters. Be clear about what you&apos;re looking for.
        </p>
      </div>

      {/* Deadline */}
      <div>
        <Label htmlFor="deadline" className="mb-2 block">
          Submission Deadline <span className="text-red-600">*</span>
        </Label>
        <input
          type="datetime-local"
          id="deadline"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          required
          disabled={isLoading}
          className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
        />
        <p className="mt-1 text-sm text-gray-500">
          Submissions will automatically close after this date.
        </p>
      </div>

      {/* Required Fields */}
      <div>
        <Label className="mb-3 block">
          Required Submission Fields
        </Label>
        <div className="space-y-2">
          {REQUIRED_FIELD_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center">
              <Checkbox
                id={`field-${option.value}`}
                checked={requiredFields.includes(option.value)}
                onChange={() => toggleRequiredField(option.value)}
                disabled={isLoading}
              />
              <Label htmlFor={`field-${option.value}`} className="ml-2">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Select which fields speakers must complete when submitting proposals.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            color="gray"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading}
        >
          {existingCfp ? "Update CFP" : "Open Call for Papers"}
        </Button>
      </div>
    </form>
  );
}
