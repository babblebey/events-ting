"use client";

/**
 * ScheduleEntryForm Component
 * Form for creating and editing schedule entries with time pickers and track selection
 * FR-019: Create schedule entries with date, time, location, track
 * FR-021: Detect overlap conflicts (warning only)
 */

import { useState, useEffect } from "react";
import { Button, Label, Select, Alert } from "flowbite-react";
import { FormField, FormSection, FormError } from "@/components/ui/form-field";
import { api } from "@/trpc/react";
import { type CreateScheduleEntryInput } from "@/lib/validators";
import { HiInformationCircle, HiExclamation } from "react-icons/hi";

interface ScheduleEntryFormProps {
  eventId: string;
  eventTimezone: string;
  initialData?: {
    id?: string;
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
    track?: string;
    trackColor?: string;
    sessionType?: string;
    speakerIds?: string[];
    updatedAt: Date;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

const SESSION_TYPES = [
  { value: "keynote", label: "Keynote" },
  { value: "talk", label: "Talk" },
  { value: "workshop", label: "Workshop" },
  { value: "break", label: "Break" },
  { value: "networking", label: "Networking" },
];

const TRACK_COLORS = [
  { value: "#3B82F6", label: "Blue" },
  { value: "#10B981", label: "Green" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#EF4444", label: "Red" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#EC4899", label: "Pink" },
  { value: "#6B7280", label: "Gray" },
];

export function ScheduleEntryForm({
  eventId,
  eventTimezone,
  initialData,
  onSuccess,
  onCancel,
}: ScheduleEntryFormProps) {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<Partial<CreateScheduleEntryInput>>({
    eventId,
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    date: initialData?.date ?? "",
    startTime: initialData?.startTime ?? "",
    endTime: initialData?.endTime ?? "",
    location: initialData?.location ?? "",
    track: initialData?.track ?? "",
    trackColor: initialData?.trackColor ?? "#3B82F6",
    sessionType: (initialData?.sessionType ?? "talk") as "keynote" | "talk" | "workshop" | "break" | "networking",
    speakerIds: initialData?.speakerIds ?? [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [overlapWarning, setOverlapWarning] = useState<{
    count: number;
    entries: Array<{ title: string; startTime: Date; endTime: Date }>;
  } | null>(null);

  // Fetch speakers for the event
  const { data: speakers } = api.speaker.list.useQuery(
    { eventId },
    { enabled: !!eventId }
  );

  // Check for overlaps when time/location changes
  const checkOverlapQuery = api.schedule.checkOverlap.useQuery(
    {
      eventId,
      startTime: formData.date && formData.startTime
        ? new Date(`${formData.date}T${formData.startTime}:00Z`)
        : new Date(),
      endTime: formData.date && formData.endTime
        ? new Date(`${formData.date}T${formData.endTime}:00Z`)
        : new Date(),
      location: formData.location ?? undefined,
      excludeId: initialData?.id,
    },
    {
      enabled: !!(formData.date && formData.startTime && formData.endTime),
    }
  );

  // Update overlap warning when query completes
  useEffect(() => {
    if (checkOverlapQuery.data) {
      if (checkOverlapQuery.data.hasOverlap) {
        setOverlapWarning({
          count: checkOverlapQuery.data.count,
          entries: checkOverlapQuery.data.entries,
        });
      } else {
        setOverlapWarning(null);
      }
    }
  }, [checkOverlapQuery.data]);

  const createMutation = api.schedule.create.useMutation({
    onSuccess: () => {
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      setErrors({ general: error.message });
    },
  });

  const updateMutation = api.schedule.update.useMutation({
    onSuccess: () => {
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      if (error.message.includes("modified by another user")) {
        setErrors({
          general:
            "This schedule entry was modified by another user. Please refresh and try again.",
        });
      } else {
        setErrors({ general: error.message });
      }
    },
  });

  const handleChange = (field: keyof CreateScheduleEntryInput, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSpeakerToggle = (speakerId: string) => {
    const currentSpeakers = formData.speakerIds ?? [];
    const newSpeakers = currentSpeakers.includes(speakerId)
      ? currentSpeakers.filter((id) => id !== speakerId)
      : [...currentSpeakers, speakerId];
    handleChange("speakerIds", newSpeakers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      if (isEditing && initialData?.id && initialData?.updatedAt) {
        await updateMutation.mutateAsync({
          id: initialData.id,
          updatedAt: initialData.updatedAt,
          title: formData.title,
          description: formData.description,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          location: formData.location,
          track: formData.track,
          trackColor: formData.trackColor,
          sessionType: formData.sessionType,
          speakerIds: formData.speakerIds,
        });
      } else {
        await createMutation.mutateAsync(formData as CreateScheduleEntryInput);
      }
    } catch {
      // Error handled in mutation callbacks
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormError message={errors.general} />

      {/* Overlap Warning */}
      {overlapWarning && (
        <Alert color="warning" icon={HiExclamation}>
          <span className="font-medium">Schedule Overlap Detected!</span>
          <div className="mt-2 text-sm">
            This entry overlaps with {overlapWarning.count} other session(s) in the same
            location:
            <ul className="mt-2 list-inside list-disc space-y-1">
              {overlapWarning.entries.map((entry, idx) => (
                <li key={idx}>{entry.title}</li>
              ))}
            </ul>
            <p className="mt-2 italic">
              Note: Overlaps are allowed but may confuse attendees.
            </p>
          </div>
        </Alert>
      )}

      <FormSection
        title="Session Details"
        description="Basic information about the schedule entry"
      >
        <FormField
          label="Title"
          name="title"
          type="text"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          error={errors.title}
          required
          placeholder="Opening Keynote"
        />

        <FormField
          label="Description"
          name="description"
          type="textarea"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          error={errors.description}
          rows={4}
          placeholder="A detailed description of the session..."
        />

        <div className="mb-4">
          <div className="mb-2 block">
            <Label htmlFor="sessionType">Session Type</Label>
          </div>
          <Select
            id="sessionType"
            value={formData.sessionType ?? "talk"}
            onChange={(e) => handleChange("sessionType", e.target.value)}
          >
            {SESSION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </div>
      </FormSection>

      <FormSection
        title="Date & Time"
        description={`Times are in ${eventTimezone} timezone`}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            label="Date"
            name="date"
            type="date"
            value={formData.date}
            onChange={(e) => handleChange("date", e.target.value)}
            error={errors.date}
            required
          />

          <FormField
            label="Start Time"
            name="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => handleChange("startTime", e.target.value)}
            error={errors.startTime}
            required
          />

          <FormField
            label="End Time"
            name="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => handleChange("endTime", e.target.value)}
            error={errors.endTime}
            required
          />
        </div>
      </FormSection>

      <FormSection
        title="Location & Track"
        description="Organize sessions by location and track"
      >
        <FormField
          label="Location"
          name="location"
          type="text"
          value={formData.location}
          onChange={(e) => handleChange("location", e.target.value)}
          error={errors.location}
          placeholder="Main Hall, Room 101, Online"
          helpText="Physical location or virtual room"
        />

        <FormField
          label="Track"
          name="track"
          type="text"
          value={formData.track}
          onChange={(e) => handleChange("track", e.target.value)}
          error={errors.track}
          placeholder="Web Development, AI/ML, DevOps"
          helpText="Categorize sessions for multi-track conferences"
        />

        <div className="mb-4">
          <div className="mb-2 block">
            <Label htmlFor="trackColor">Track Color</Label>
          </div>
          <div className="flex gap-2">
            {TRACK_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => handleChange("trackColor", color.value)}
                className={`h-10 w-10 rounded-full border-2 ${
                  formData.trackColor === color.value
                    ? "border-gray-900 ring-2 ring-gray-900 dark:border-white dark:ring-white"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                style={{ backgroundColor: color.value }}
                title={color.label}
              />
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Select a color to visually identify this track
          </p>
        </div>
      </FormSection>

      <FormSection
        title="Speakers"
        description="Assign speakers to this session"
      >
        {speakers && speakers.length > 0 ? (
          <div className="space-y-2">
            {speakers.map((speaker) => (
              <label
                key={speaker.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <input
                  type="checkbox"
                  checked={formData.speakerIds?.includes(speaker.id) ?? false}
                  onChange={() => handleSpeakerToggle(speaker.id)}
                  className="h-4 w-4 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
                />
                <div className="flex items-center gap-3">
                  {speaker.photo && (
                    <img
                      src={speaker.photo}
                      alt={speaker.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {speaker.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {speaker.email}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <Alert color="info" icon={HiInformationCircle}>
            <span>
              No speakers available. Add speakers first to assign them to sessions.
            </span>
          </Alert>
        )}
      </FormSection>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEditing ? "Update Entry" : "Create Entry"}
        </Button>

        {onCancel && (
          <Button type="button" color="gray" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
