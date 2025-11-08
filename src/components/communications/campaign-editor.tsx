"use client";

import { useState } from "react";
import { Button, Label, TextInput, Textarea, Select } from "flowbite-react";
import { api } from "@/trpc/react";

interface CampaignEditorProps {
  eventId: string;
  campaignId?: string;
  onSuccess?: () => void;
}

export function CampaignEditor({
  eventId,
  campaignId,
  onSuccess,
}: CampaignEditorProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientType, setRecipientType] = useState<
    "all_attendees" | "ticket_type" | "speakers" | "custom"
  >("all_attendees");
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState("");

  const utils = api.useUtils();

  // Fetch existing campaign if editing
  const { data: existingCampaign } = api.communication.getCampaign.useQuery(
    { id: campaignId! },
    { enabled: !!campaignId }
  );

  // Fetch ticket types for recipient selection
  const { data: ticketTypes } = api.ticket.list.useQuery({ eventId });

  // Create or update mutation
  const createMutation = api.communication.createCampaign.useMutation({
    onSuccess: () => {
      void utils.communication.listCampaigns.invalidate();
      onSuccess?.();
    },
  });

  const updateMutation = api.communication.updateCampaign.useMutation({
    onSuccess: () => {
      void utils.communication.listCampaigns.invalidate();
      void utils.communication.getCampaign.invalidate({ id: campaignId! });
      onSuccess?.();
    },
  });

  // Load existing campaign data
  useState(() => {
    if (existingCampaign) {
      setSubject(existingCampaign.subject);
      setBody(existingCampaign.body);
      setRecipientType(existingCampaign.recipientType as typeof recipientType);
      if (existingCampaign.recipientFilter &&
          typeof existingCampaign.recipientFilter === 'object' &&
          'ticketTypeId' in existingCampaign.recipientFilter) {
        setSelectedTicketTypeId(
          existingCampaign.recipientFilter.ticketTypeId as string
        );
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const recipientFilter =
      recipientType === "ticket_type"
        ? { ticketTypeId: selectedTicketTypeId }
        : undefined;

    if (campaignId) {
      updateMutation.mutate({
        id: campaignId,
        subject,
        body,
        recipientType,
        recipientFilter,
      });
    } else {
      createMutation.mutate({
        eventId,
        subject,
        body,
        recipientType,
        recipientFilter,
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Subject */}
      <div>
        <Label htmlFor="subject">Email Subject</Label>
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
      </div>

      {/* Recipient Type */}
      <div>
        <Label htmlFor="recipientType">Send To</Label>
        <Select
          id="recipientType"
          value={recipientType}
          onChange={(e) =>
            setRecipientType(
              e.target.value as typeof recipientType
            )
          }
          required
          disabled={isLoading}
        >
          <option value="all_attendees">All Attendees</option>
          <option value="ticket_type">Specific Ticket Type</option>
          <option value="speakers">All Speakers</option>
          <option value="custom">Custom List</option>
        </Select>
      </div>

      {/* Ticket Type Selection (conditional) */}
      {recipientType === "ticket_type" && (
        <div>
          <Label htmlFor="ticketType">Select Ticket Type</Label>
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

      {/* Email Body */}
      <div>
        <Label htmlFor="body">Email Content</Label>
        <Textarea
          id="body"
          placeholder="Enter your email message (HTML supported)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={12}
          disabled={isLoading}
        />
        <p className="mt-1 text-sm text-gray-500">
          You can use HTML tags for formatting. The email will be wrapped in a professional template.
        </p>
      </div>

      {/* Preview Note */}
      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-semibold">💡 Preview Your Email</p>
        <p className="mt-1">
          After saving, you can send a test email to yourself before sending to
          all recipients.
        </p>
      </div>

      {/* Error Display */}
      {(createMutation.error || updateMutation.error) && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Error</p>
          <p className="mt-1">
            {createMutation.error?.message || updateMutation.error?.message}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? "Saving..."
            : campaignId
              ? "Update Campaign"
              : "Create Draft"}
        </Button>
        {campaignId && (
          <Button color="light" type="button" onClick={onSuccess}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
