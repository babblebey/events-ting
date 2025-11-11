"use client";

/**
 * RegistrationForm Component
 * Public form for event registration
 */

import { useState } from "react";
import { Button } from "flowbite-react";
import { FormField, FormSection, FormError } from "@/components/ui/form-field";
import { api } from "@/trpc/react";
import { type CreateRegistrationInput } from "@/lib/validators";
import { HiCheckCircle } from "react-icons/hi";

interface RegistrationFormProps {
  ticketTypeId: string;
  ticketTypeName: string;
  eventName: string;
  onSuccess?: (registrationId: string) => void;
}

export function RegistrationForm({
  ticketTypeId,
  ticketTypeName,
  eventName,
  onSuccess,
}: RegistrationFormProps) {
  const [formData, setFormData] = useState<Partial<CreateRegistrationInput>>({
    ticketTypeId,
    email: "",
    name: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [registrationCode, setRegistrationCode] = useState<string>("");

  const createMutation = api.registration.create.useMutation({
    onSuccess: (data) => {
      setSuccess(true);
      setRegistrationCode(data.registrationCode);
      if (onSuccess) {
        onSuccess(data.id);
      }
    },
    onError: (error) => {
      setErrors({ general: error.message });
    },
  });

  const handleChange = (
    field: keyof CreateRegistrationInput,
    value: string,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate required fields
    if (!formData.name) {
      setErrors({ name: "Name is required" });
      return;
    }
    if (!formData.email) {
      setErrors({ email: "Email is required" });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrors({ email: "Please enter a valid email address" });
      return;
    }

    try {
      await createMutation.mutateAsync(formData as CreateRegistrationInput);
    } catch (error) {
      // Error handling done in mutation callbacks
      console.error("Form submission error:", error);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <HiCheckCircle className="h-10 w-10 text-green-600" />
        </div>

        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          Registration Confirmed! 🎉
        </h2>

        <p className="mb-4 text-gray-600">
          You&apos;re all set for <strong>{eventName}</strong>
        </p>

        <div className="mx-auto mb-6 max-w-md rounded-lg bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-gray-700">
            Your Registration Code:
          </p>
          <p className="font-mono text-2xl font-bold tracking-wider text-blue-600">
            {registrationCode}
          </p>
        </div>

        <p className="text-sm text-gray-600">
          A confirmation email has been sent to{" "}
          <strong>{formData.email}</strong>
        </p>

        <p className="mt-4 text-sm text-gray-500">
          Keep your registration code handy for event check-in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && <FormError message={errors.general} />}

      <div className="rounded-lg border bg-gray-50 p-4">
        <p className="text-sm text-gray-600">Registering for:</p>
        <p className="text-lg font-semibold text-gray-900">{ticketTypeName}</p>
      </div>

      <FormSection title="Your Information">
        <FormField
          label="Full Name"
          name="name"
          required
          value={formData.name ?? ""}
          onChange={(e) => handleChange("name", e.target.value)}
          error={errors.name}
          placeholder="John Doe"
          autoComplete="name"
        />

        <FormField
          label="Email Address"
          name="email"
          type="email"
          required
          value={formData.email ?? ""}
          onChange={(e) => handleChange("email", e.target.value)}
          error={errors.email}
          placeholder="john@example.com"
          helpText="You'll receive confirmation at this email"
          autoComplete="email"
        />
      </FormSection>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          ℹ️ By registering, you agree to receive event-related communications.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 border-t pt-6">
        <Button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full sm:w-auto"
          size="lg"
        >
          {createMutation.isPending
            ? "Registering..."
            : "Complete Registration"}
        </Button>
      </div>
    </form>
  );
}
