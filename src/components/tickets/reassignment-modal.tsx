"use client";

/**
 * Ticket Reassignment Modal Component
 * Allows buyers to reassign tickets to different attendees
 */

import { useState, useEffect } from "react";
import { Modal, ModalHeader, ModalBody, Button, Label, TextInput, Alert } from "flowbite-react";
import {
  HiExclamationCircle,
  HiInformationCircle,
  HiUserCircle,
} from "react-icons/hi";
import { api } from "@/trpc/react";
import { validateEmail } from "@/lib/validators/email";

interface ReassignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: {
    id: string;
    ticketNumber: string;
    attendee: {
      id: string;
      name: string;
      email: string;
    } | null;
    updatedAt: Date;
  };
  eventName: string;
  customFields?: Array<{
    id: string;
    type: "text" | "textarea" | "select" | "radio" | "checkbox";
    label: string;
    required: boolean;
    options?: string[];
  }>;
  onSuccess?: () => void;
}

export function ReassignmentModal({
  isOpen,
  onClose,
  ticket,
  eventName,
  customFields = [],
  onSuccess,
}: ReassignmentModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [customData, setCustomData] = useState<Record<string, unknown>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);

  const utils = api.useUtils();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setEmail("");
      setCustomData({});
      setEmailWarning(null);
      setShowConfirmation(false);
    }
  }, [isOpen]);

  // Validate email on change
  useEffect(() => {
    if (email) {
      const validation = validateEmail(email);
      setEmailWarning(validation.warnings?.[0] ?? null);
    } else {
      setEmailWarning(null);
    }
  }, [email]);

  const assignMutation = api.tickets.assign.useMutation({
    onSuccess: () => {
      void utils.registration.getById.invalidate();
      void utils.tickets.list.invalidate();
      onSuccess?.();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // If ticket is already assigned, show confirmation step
    if (ticket.attendee && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    // Proceed with assignment
    assignMutation.mutate({
      ticketId: ticket.id,
      attendee: {
        name,
        email,
        customData: Object.keys(customData).length > 0 ? customData : undefined,
      },
      expectedUpdatedAt: ticket.updatedAt,
    });
  };

  const handleCancel = () => {
    if (showConfirmation) {
      setShowConfirmation(false);
    } else {
      onClose();
    }
  };

  return (
    <Modal show={isOpen} onClose={onClose} size="lg" dismissible>
      <ModalHeader>
        {ticket.attendee ? "Reassign Ticket" : "Assign Ticket"}
      </ModalHeader>

      <ModalBody>
        {/* Current Assignment Warning (if reassigning) */}
        {ticket.attendee && (
          <Alert
            color={showConfirmation ? "failure" : "warning"}
            icon={HiExclamationCircle}
            className="mb-4"
          >
            <div>
              <span className="font-medium">
                {showConfirmation ? "Confirm Reassignment:" : "Current Assignment:"}
              </span>
              <p className="mt-2 text-sm">
                This ticket is currently assigned to{" "}
                <strong>{ticket.attendee.name}</strong> ({ticket.attendee.email}).
              </p>
              {showConfirmation && (
                <p className="mt-2 text-sm">
                  ⚠️ Reassigning this ticket will permanently delete the previous
                  attendee&apos;s information for privacy reasons. This action cannot be
                  undone.
                </p>
              )}
            </div>
          </Alert>
        )}

        {/* Privacy Notice */}
        {!showConfirmation && (
          <Alert color="info" icon={HiInformationCircle} className="mb-4">
            <div className="text-sm">
              <p className="font-medium">Privacy Notice:</p>
              <p className="mt-1">
                If you reassign this ticket, the previous attendee&apos;s information
                will be permanently deleted for privacy compliance (GDPR).
              </p>
            </div>
          </Alert>
        )}

        {/* Assignment Form (only show if not in confirmation mode) */}
        {!showConfirmation && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Event Info */}
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-sm">
                <HiUserCircle className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {eventName}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Ticket: {ticket.ticketNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* Attendee Name */}
            <div>
              <Label htmlFor="name">
                Attendee Name <span className="text-red-600">*</span>
              </Label>
              <TextInput
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
                disabled={assignMutation.isPending}
              />
            </div>

            {/* Attendee Email */}
            <div>
              <Label htmlFor="email">
                Attendee Email <span className="text-red-600">*</span>
              </Label>
              <TextInput
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={assignMutation.isPending}
                color={emailWarning ? "warning" : undefined}
              />
              {emailWarning && (
                <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                  {emailWarning}
                </p>
              )}
            </div>

            {/* Custom Fields */}
            {customFields.map((field) => (
              <div key={field.id}>
                <Label htmlFor={field.id}>
                  {field.label}
                  {field.required && <span className="text-red-600">*</span>}
                </Label>

                {field.type === "text" && (
                  <TextInput
                    id={field.id}
                    type="text"
                    value={(customData[field.id] as string) || ""}
                    onChange={(e) =>
                      setCustomData({ ...customData, [field.id]: e.target.value })
                    }
                    required={field.required}
                    disabled={assignMutation.isPending}
                  />
                )}

                {field.type === "select" && (
                  <select
                    id={field.id}
                    value={(customData[field.id] as string) || ""}
                    onChange={(e) =>
                      setCustomData({ ...customData, [field.id]: e.target.value })
                    }
                    required={field.required}
                    disabled={assignMutation.isPending}
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                  >
                    <option value="">Select an option...</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}

            {/* Error Display */}
            {assignMutation.error && (
              <Alert color="failure" icon={HiExclamationCircle}>
                <span className="font-medium">Assignment failed:</span>{" "}
                {assignMutation.error.message}
              </Alert>
            )}
          </form>
        )}

        {/* Confirmation Mode */}
        {showConfirmation && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                New Assignment Details
              </h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-600 dark:text-gray-400">Name:</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">
                    {name}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-600 dark:text-gray-400">Email:</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">
                    {email}
                  </dd>
                </div>
              </dl>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to reassign this ticket? The previous attendee
              data will be permanently deleted.
            </p>
          </div>
        )}
      </ModalBody>

      <div className="flex justify-end gap-3 border-t border-gray-200 p-6 dark:border-gray-700">
          <Button color="gray" onClick={handleCancel} disabled={assignMutation.isPending}>
            {showConfirmation ? "Back" : "Cancel"}
          </Button>
          <Button
            color={showConfirmation ? "failure" : "blue"}
            onClick={handleSubmit}
            disabled={assignMutation.isPending ?? (!name ?? !email)}
          >
            {assignMutation.isPending
              ? "Assigning..."
              : showConfirmation
                ? "Confirm Reassignment"
                : ticket.attendee
                  ? "Continue"
                  : "Assign Ticket"}
          </Button>
      </div>
    </Modal>
  );
}
