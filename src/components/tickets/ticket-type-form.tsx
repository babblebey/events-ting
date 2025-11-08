"use client";

/**
 * TicketTypeForm Component
 * Form for creating and editing ticket types
 */

import { useState } from "react";
import { Button, Label, Textarea } from "flowbite-react";
import { FormField, FormSection, FormError } from "@/components/ui/form-field";
import { api } from "@/trpc/react";
import { type CreateTicketTypeInput } from "@/lib/validators";

interface TicketTypeFormProps {
  eventId: string;
  initialData?: Partial<CreateTicketTypeInput> & { id?: string };
  onSuccess?: (ticketTypeId: string) => void;
  onCancel?: () => void;
}

export function TicketTypeForm({
  eventId,
  initialData,
  onSuccess,
  onCancel,
}: TicketTypeFormProps) {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<Partial<CreateTicketTypeInput>>({
    eventId,
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    price: initialData?.price ?? 0,
    currency: initialData?.currency ?? "USD",
    quantity: initialData?.quantity ?? 100,
    saleStart: initialData?.saleStart,
    saleEnd: initialData?.saleEnd,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = api.ticket.create.useMutation({
    onSuccess: (data) => {
      if (onSuccess) {
        onSuccess(data.id);
      }
    },
    onError: (error) => {
      setErrors({ general: error.message });
    },
  });

  const updateMutation = api.ticket.update.useMutation({
    onSuccess: (data) => {
      if (onSuccess) {
        onSuccess(data.id);
      }
    },
    onError: (error) => {
      setErrors({ general: error.message });
    },
  });

  const handleChange = (field: keyof CreateTicketTypeInput, value: unknown) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate required fields
    if (!formData.name) {
      setErrors({ name: "Name is required" });
      return;
    }
    if (!formData.description) {
      setErrors({ description: "Description is required" });
      return;
    }
    if (!formData.quantity || formData.quantity <= 0) {
      setErrors({ quantity: "Quantity must be greater than 0" });
      return;
    }

    try {
      if (isEditing && initialData?.id) {
        await updateMutation.mutateAsync({
          id: initialData.id,
          ...formData,
        });
      } else {
        await createMutation.mutateAsync(formData as CreateTicketTypeInput);
      }
    } catch (error) {
      // Error handling done in mutation callbacks
      console.error("Form submission error:", error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && <FormError message={errors.general} />}

      <FormSection title="Ticket Details">
        <FormField
          label="Ticket Name"
          name="name"
          required
          value={formData.name ?? ""}
          onChange={(e) => handleChange("name", e.target.value)}
          error={errors.name}
          placeholder="General Admission"
          helpText="A clear, descriptive name for this ticket type"
        />

        <div className="space-y-2">
          <Label htmlFor="description">
            Description <span className="text-red-600">*</span>
          </Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description ?? ""}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Access to all sessions and networking events..."
            rows={4}
            required
            color={errors.description ? "failure" : undefined}
          />
          {errors.description && (
            <p className="text-sm text-red-600">{errors.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="Quantity"
            name="quantity"
            type="number"
            required
            value={formData.quantity ?? ""}
            onChange={(e) => handleChange("quantity", parseInt(e.target.value, 10))}
            error={errors.quantity}
            placeholder="100"
            helpText="Total number of tickets available"
            min={1}
          />

          <div className="space-y-2">
            <Label htmlFor="price">
              Price <span className="text-red-600">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price ?? 0}
                onChange={(e) => handleChange("price", parseFloat(e.target.value))}
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="0.00"
                step="0.01"
                min="0"
                disabled
                required
              />
              <select
                value={formData.currency ?? "USD"}
                onChange={(e) => handleChange("currency", e.target.value)}
                className="rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900"
                disabled
              >
                <option value="USD">USD</option>
              </select>
            </div>
            <p className="text-sm text-gray-500">
              💡 MVP: Only free tickets ($0.00) are supported
            </p>
          </div>
        </div>
      </FormSection>

      <FormSection title="Sale Period (Optional)">
        <p className="text-sm text-gray-500 mb-4">
          Limit when tickets can be purchased. Leave empty for no restrictions.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="Sale Start"
            name="saleStart"
            type="datetime-local"
            value={
              formData.saleStart
                ? new Date(formData.saleStart).toISOString().slice(0, 16)
                : ""
            }
            onChange={(e) =>
              handleChange("saleStart", e.target.value ? new Date(e.target.value) : undefined)
            }
            error={errors.saleStart}
            helpText="When tickets become available"
          />

          <FormField
            label="Sale End"
            name="saleEnd"
            type="datetime-local"
            value={
              formData.saleEnd
                ? new Date(formData.saleEnd).toISOString().slice(0, 16)
                : ""
            }
            onChange={(e) =>
              handleChange("saleEnd", e.target.value ? new Date(e.target.value) : undefined)
            }
            error={errors.saleEnd}
            helpText="When ticket sales close"
          />
        </div>
      </FormSection>

      <div className="flex items-center justify-end gap-3 border-t pt-6">
        {onCancel && (
          <Button color="gray" onClick={onCancel} type="button" disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : isEditing ? "Update Ticket Type" : "Create Ticket Type"}
        </Button>
      </div>
    </form>
  );
}
