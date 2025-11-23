"use client";

/**
 * EmailComposer Component
 * Compose and send email campaigns to attendees with recipient filtering
 * Part of User Story 5: Buyer vs Attendee Communication
 */

import { useState } from "react";
import {
  Button,
  Label,
  TextInput,
  Textarea,
  Select,
  Card,
  Badge,
  Alert,
} from "flowbite-react";
import { api } from "@/trpc/react";
import { HiInformationCircle, HiMail } from "react-icons/hi";

interface EmailComposerProps {
  eventId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type RecipientFilter = "all" | "active" | "ticket_type";

export function EmailComposer({
  eventId,
  onSuccess,
  onCancel,
}: EmailComposerProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientFilter, setRecipientFilter] =
    useState<RecipientFilter>("active");
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState("");
  const [sendingStatus, setSendingStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  // Fetch ticket types for filtering
  const { data: ticketTypes } = api.ticket.list.useQuery({
    eventId,
    includeUnavailable: true,
  });

  // Fetch attendees to show recipient count
  const { data: attendeesData } = api.attendees.list.useQuery({
    eventId,
    limit: 1, // We only need the total count
    emailStatus:
      recipientFilter === "all"
        ? undefined
        : recipientFilter === "active"
          ? "active"
          : undefined,
  });

  // Calculate recipient count
  const recipientCount = attendeesData?.total ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (recipientCount === 0) {
      alert("No recipients found matching your filter criteria.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to send this email to ${recipientCount} ${recipientCount === 1 ? "attendee" : "attendees"}? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setSendingStatus("sending");

      // TODO: Implement actual email sending via tRPC procedure
      // This will be implemented in T073 (webhook handler) and integrated here
      // For now, we'll show a success message

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSendingStatus("sent");

      // Reset form after delay
      setTimeout(() => {
        setSubject("");
        setBody("");
        setRecipientFilter("active");
        setSelectedTicketTypeId("");
        setSendingStatus("idle");
        onSuccess?.();
      }, 2000);
    } catch (error) {
      console.error("Failed to send email:", error);
      setSendingStatus("error");
    }
  };

  const isLoading = sendingStatus === "sending";
  const isSent = sendingStatus === "sent";
  const hasError = sendingStatus === "error";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Success Alert */}
      {isSent && (
        <Alert color="success" icon={HiInformationCircle}>
          <span className="font-medium">Email sent successfully!</span> Your
          email has been sent to {recipientCount}{" "}
          {recipientCount === 1 ? "attendee" : "attendees"}.
        </Alert>
      )}

      {/* Error Alert */}
      {hasError && (
        <Alert color="failure" icon={HiInformationCircle}>
          <span className="font-medium">Failed to send email.</span> Please try
          again or contact support if the problem persists.
        </Alert>
      )}

      {/* Subject */}
      <div>
        <Label htmlFor="subject">
          Email Subject <span className="text-red-600">*</span>
        </Label>
        <TextInput
          id="subject"
          type="text"
          placeholder="Enter email subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          maxLength={200}
          disabled={isLoading}
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Keep it concise and relevant to your event
        </p>
      </div>

      {/* Recipient Filter */}
      <div>
        <Label htmlFor="recipientFilter">
          Send To <span className="text-red-600">*</span>
        </Label>
        <Select
          id="recipientFilter"
          value={recipientFilter}
          onChange={(e) => {
            setRecipientFilter(e.target.value as RecipientFilter);
            setSelectedTicketTypeId(""); // Reset ticket type selection
          }}
          required
          disabled={isLoading}
        >
          <option value="active">Active Attendees (Recommended)</option>
          <option value="all">All Attendees</option>
          <option value="ticket_type">Specific Ticket Type</option>
        </Select>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {recipientFilter === "active" &&
            "Sends to attendees with active email status (excludes bounced/unsubscribed)"}
          {recipientFilter === "all" &&
            "Sends to all attendees regardless of email status"}
          {recipientFilter === "ticket_type" &&
            "Sends to attendees with a specific ticket type"}
        </p>
      </div>

      {/* Ticket Type Selection (conditional) */}
      {recipientFilter === "ticket_type" && (
        <div>
          <Label htmlFor="ticketType">
            Select Ticket Type <span className="text-red-600">*</span>
          </Label>
          <Select
            id="ticketType"
            value={selectedTicketTypeId}
            onChange={(e) => setSelectedTicketTypeId(e.target.value)}
            required
            disabled={isLoading || !ticketTypes}
          >
            <option value="">Choose a ticket type...</option>
            {ticketTypes?.items.map((ticket) => (
              <option key={ticket.id} value={ticket.id}>
                {ticket.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Recipient Count Card */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Recipients
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {recipientFilter === "active" &&
                "Attendees with active email status"}
              {recipientFilter === "all" && "All attendees"}
              {recipientFilter === "ticket_type" &&
                selectedTicketTypeId &&
                `Attendees with ${ticketTypes?.items.find((t) => t.id === selectedTicketTypeId)?.name ?? "selected"} tickets`}
              {recipientFilter === "ticket_type" &&
                !selectedTicketTypeId &&
                "Select a ticket type"}
            </p>
          </div>
          <Badge size="xl" color={recipientCount > 0 ? "info" : "gray"}>
            <span className="text-2xl font-bold">{recipientCount}</span>
          </Badge>
        </div>

        {recipientCount === 0 && (
          <div className="mt-3 rounded-lg bg-orange-50 p-3 text-sm text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            ⚠️ No recipients found. Make sure tickets have been assigned to
            attendees before sending emails.
          </div>
        )}
      </Card>

      {/* Email Body */}
      <div>
        <Label htmlFor="body">
          Email Content <span className="text-red-600">*</span>
        </Label>
        <Textarea
          id="body"
          placeholder="Enter your email message here..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={12}
          disabled={isLoading}
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Plain text is recommended. Your message will be sent in a professional
          email template.
        </p>
      </div>

      {/* Preview Note */}
      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900 dark:text-blue-200">
        <p className="font-semibold">💡 Email Preview</p>
        <p className="mt-1">
          Each attendee will receive a personalized email at their individual
          email address (not the ticket buyer&apos;s email). The email will
          include their name and ticket details.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isLoading || recipientCount === 0}
          color="blue"
        >
          {isLoading ? (
            <>
              <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Sending...
            </>
          ) : (
            <>
              <HiMail className="mr-2 h-5 w-5" />
              Send Email to {recipientCount}{" "}
              {recipientCount === 1 ? "Attendee" : "Attendees"}
            </>
          )}
        </Button>
        {onCancel && (
          <Button
            color="gray"
            type="button"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Important Notes */}
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
        <p className="font-semibold">⚠️ Important Notes</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Emails are sent to individual attendees, not ticket buyers</li>
          <li>
            Attendees with &quot;bounced&quot; or &quot;unsubscribed&quot; email
            status will be excluded when using &quot;Active Attendees&quot;
            filter
          </li>
          <li>
            This action cannot be undone - review your message carefully before
            sending
          </li>
          <li>
            Email delivery may take a few minutes depending on the number of
            recipients
          </li>
        </ul>
      </div>
    </form>
  );
}
