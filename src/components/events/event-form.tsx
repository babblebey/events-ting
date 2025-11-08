"use client";

/**
 * EventForm Component
 * Form for creating and editing events with comprehensive validation
 */

import { useState } from "react";
import { Button, Label, Select, ToggleSwitch } from "flowbite-react";
import { FormField, FormSection, FormError } from "@/components/ui/form-field";
import { api } from "@/trpc/react";
import { type CreateEventInput } from "@/lib/validators";
import { useRouter } from "next/navigation";

interface EventFormProps {
  initialData?: Partial<CreateEventInput> & { id?: string };
  onSuccess?: (eventId: string) => void;
}

// IANA Timezone options (common ones)
const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Africa/Lagos", label: "Lagos" },
];

export function EventForm({ initialData, onSuccess }: EventFormProps) {
  const router = useRouter();
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<Partial<CreateEventInput>>({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    slug: initialData?.slug ?? "",
    locationType: initialData?.locationType ?? "in-person",
    locationAddress: initialData?.locationAddress ?? "",
    locationUrl: initialData?.locationUrl ?? "",
    timezone: initialData?.timezone ?? "UTC",
    startDate: initialData?.startDate ?? undefined,
    endDate: initialData?.endDate ?? undefined,
    status: initialData?.status ?? "draft",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = api.event.create.useMutation({
    onSuccess: (data) => {
      if (onSuccess) {
        onSuccess(data.id);
      } else {
        router.push(`/${data.id}`);
      }
    },
    onError: (error) => {
      setErrors({ general: error.message });
    },
  });

  const updateMutation = api.event.update.useMutation({
    onSuccess: (data) => {
      if (onSuccess) {
        onSuccess(data.id);
      } else {
        router.refresh();
      }
    },
    onError: (error) => {
      setErrors({ general: error.message });
    },
  });

  const handleChange = (
    field: keyof CreateEventInput,
    value: string | Date
  ) => {
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

  const generateSlug = () => {
    if (formData.name) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate required fields
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) newErrors.name = "Event name is required";
    if (!formData.description?.trim())
      newErrors.description = "Description is required";
    if (!formData.slug?.trim()) newErrors.slug = "Slug is required";
    if (!formData.startDate) newErrors.startDate = "Start date is required";
    if (!formData.endDate) newErrors.endDate = "End date is required";

    // Validate location fields based on type
    if (
      (formData.locationType === "in-person" ||
        formData.locationType === "hybrid") &&
      !formData.locationAddress?.trim()
    ) {
      newErrors.locationAddress =
        "Address is required for in-person or hybrid events";
    }

    if (
      (formData.locationType === "virtual" ||
        formData.locationType === "hybrid") &&
      !formData.locationUrl?.trim()
    ) {
      newErrors.locationUrl = "URL is required for virtual or hybrid events";
    }

    // Validate date order
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) <= new Date(formData.startDate)) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit form
    if (isEditing && initialData?.id) {
      await updateMutation.mutateAsync({
        id: initialData.id,
        ...formData,
      });
    } else {
      await createMutation.mutateAsync(formData as CreateEventInput);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormError message={errors.general} />

      <FormSection
        title="Basic Information"
        description="Core details about your event"
      >
        <FormField
          label="Event Name"
          name="name"
          required
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          onBlur={generateSlug}
          error={errors.name}
          placeholder="e.g., Next.js Conf 2025"
        />

        <FormField
          label="URL Slug"
          name="slug"
          required
          value={formData.slug}
          onChange={(e) => handleChange("slug", e.target.value)}
          error={errors.slug}
          placeholder="nextjs-conf-2025"
          helpText="Used in the event URL. Only lowercase letters, numbers, and hyphens."
        />

        <FormField
          label="Description"
          name="description"
          type="textarea"
          rows={6}
          required
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          error={errors.description}
          placeholder="Tell attendees what your event is about..."
        />
      </FormSection>

      <FormSection
        title="Location & Format"
        description="Where and how your event will take place"
      >
        <div className="mb-4">
          <div className="mb-2 block">
            <Label htmlFor="locationType">Location Type</Label>
            <span className="ml-1 text-red-500">*</span>
          </div>
          <Select
            id="locationType"
            value={formData.locationType}
            onChange={(e) =>
              handleChange(
                "locationType",
                e.target.value as "in-person" | "virtual" | "hybrid"
              )
            }
            required
          >
            <option value="in-person">In-Person</option>
            <option value="virtual">Virtual</option>
            <option value="hybrid">Hybrid</option>
          </Select>
        </div>

        {(formData.locationType === "in-person" ||
          formData.locationType === "hybrid") && (
          <FormField
            label="Physical Address"
            name="locationAddress"
            required={
              formData.locationType === "in-person" ||
              formData.locationType === "hybrid"
            }
            value={formData.locationAddress}
            onChange={(e) => handleChange("locationAddress", e.target.value)}
            error={errors.locationAddress}
            placeholder="123 Main St, San Francisco, CA 94105"
          />
        )}

        {(formData.locationType === "virtual" ||
          formData.locationType === "hybrid") && (
          <FormField
            label="Virtual Event URL"
            name="locationUrl"
            type="url"
            required={
              formData.locationType === "virtual" ||
              formData.locationType === "hybrid"
            }
            value={formData.locationUrl}
            onChange={(e) => handleChange("locationUrl", e.target.value)}
            error={errors.locationUrl}
            placeholder="https://zoom.us/j/example"
          />
        )}
      </FormSection>

      <FormSection
        title="Date & Time"
        description="When your event will take place"
      >
        <div className="mb-4">
          <div className="mb-2 block">
            <Label htmlFor="timezone">Timezone</Label>
            <span className="ml-1 text-red-500">*</span>
          </div>
          <Select
            id="timezone"
            value={formData.timezone}
            onChange={(e) => handleChange("timezone", e.target.value)}
            required
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            All event times will be displayed in this timezone
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="Start Date"
            name="startDate"
            type="date"
            required
            value={
              formData.startDate
                ? new Date(formData.startDate).toISOString().split("T")[0]
                : ""
            }
            onChange={(e) => handleChange("startDate", new Date(e.target.value))}
            error={errors.startDate}
          />

          <FormField
            label="End Date"
            name="endDate"
            type="date"
            required
            value={
              formData.endDate
                ? new Date(formData.endDate).toISOString().split("T")[0]
                : ""
            }
            onChange={(e) => handleChange("endDate", new Date(e.target.value))}
            error={errors.endDate}
          />
        </div>
      </FormSection>

      <FormSection title="Visibility" description="Control who can see your event">
        <div className="mb-4">
          <div className="mb-2 block">
            <Label htmlFor="status">Publication Status</Label>
          </div>
          <Select
            id="status"
            value={formData.status}
            onChange={(e) =>
              handleChange(
                "status",
                e.target.value as "draft" | "published" | "archived"
              )
            }
          >
            <option value="draft">Draft (only visible to you)</option>
            <option value="published">Published (public)</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
      </FormSection>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? isEditing
              ? "Saving..."
              : "Creating..."
            : isEditing
              ? "Save Changes"
              : "Create Event"}
        </Button>
        <Button
          color="gray"
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
