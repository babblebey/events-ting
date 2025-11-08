"use client";

import { useState, useEffect } from "react";
import { Label, Select, Card, Badge } from "flowbite-react";
import { api } from "@/trpc/react";

interface RecipientSelectorProps {
  eventId: string;
  value: {
    recipientType: "all_attendees" | "ticket_type" | "speakers" | "custom";
    recipientFilter?: Record<string, unknown>;
  };
  onChange: (value: {
    recipientType: "all_attendees" | "ticket_type" | "speakers" | "custom";
    recipientFilter?: Record<string, unknown>;
  }) => void;
  disabled?: boolean;
}

export function RecipientSelector({
  eventId,
  value,
  onChange,
  disabled = false,
}: RecipientSelectorProps) {
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string>("");
  const [estimatedRecipients, setEstimatedRecipients] = useState<number>(0);

  // Fetch ticket types for selection
  const { data: ticketTypes } = api.ticket.list.useQuery({ eventId });

  // Fetch registration counts
  const { data: registrations } = api.registration.list.useQuery({
    eventId,
    limit: 1, // We only need the count, not the actual data
  });

  // Fetch speaker count
  const { data: speakers } = api.speaker.getByEvent.useQuery({ eventId });

  // Update recipient filter when ticket type changes
  useEffect(() => {
    if (value.recipientType === "ticket_type" && selectedTicketTypeId) {
      onChange({
        recipientType: "ticket_type",
        recipientFilter: { ticketTypeId: selectedTicketTypeId },
      });
    }
  }, [selectedTicketTypeId, value.recipientType, onChange]);

  // Calculate estimated recipients based on selection
  useEffect(() => {
    const calculateEstimate = async () => {
      switch (value.recipientType) {
        case "all_attendees": {
          // Get total active registrations
          const count = registrations?.items.filter(
            (r: { emailStatus?: string }) => r.emailStatus === "active"
          ).length ?? 0;
          setEstimatedRecipients(count);
          break;
        }
        case "ticket_type": {
          if (selectedTicketTypeId && registrations) {
            const count = registrations.items.filter(
              (r: { ticketType: { id: string }; emailStatus?: string }) =>
                r.ticketType.id === selectedTicketTypeId &&
                r.emailStatus === "active"
            ).length;
            setEstimatedRecipients(count);
          } else {
            setEstimatedRecipients(0);
          }
          break;
        }
        case "speakers": {
          setEstimatedRecipients(speakers?.length ?? 0);
          break;
        }
        case "custom": {
          // Custom lists require manual input
          setEstimatedRecipients(0);
          break;
        }
        default:
          setEstimatedRecipients(0);
      }
    };

    void calculateEstimate();
  }, [value.recipientType, selectedTicketTypeId, registrations, speakers]);

  const handleRecipientTypeChange = (newType: typeof value.recipientType) => {
    onChange({
      recipientType: newType,
      recipientFilter: undefined,
    });
    setSelectedTicketTypeId("");
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="recipientType">Send To</Label>
        <Select
          id="recipientType"
          value={value.recipientType}
          onChange={(e) =>
            handleRecipientTypeChange(
              e.target.value as typeof value.recipientType
            )
          }
          disabled={disabled}
          required
        >
          <option value="all_attendees">All Attendees</option>
          <option value="ticket_type">Specific Ticket Type</option>
          <option value="speakers">All Speakers</option>
          <option value="custom">Custom List</option>
        </Select>
      </div>

      {/* Ticket Type Selection */}
      {value.recipientType === "ticket_type" && (
        <div>
          <Label htmlFor="ticketType">Select Ticket Type</Label>
          <Select
            id="ticketType"
            value={selectedTicketTypeId}
            onChange={(e) => setSelectedTicketTypeId(e.target.value)}
            disabled={disabled ?? !ticketTypes}
            required
          >
            <option value="">Choose a ticket type...</option>
            {ticketTypes?.items.map((ticket: { id: string; name: string }) => (
              <option key={ticket.id} value={ticket.id}>
                {ticket.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Custom List Note */}
      {value.recipientType === "custom" && (
        <Card>
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900">Custom Recipient List</h4>
            <p className="text-sm text-gray-600">
              Custom lists allow you to send emails to specific individuals outside
              of your standard attendee or speaker groups. You will need to provide
              the list of email addresses when sending the campaign.
            </p>
            <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
              ⚠️ This feature is currently in development. For now, please use
              one of the predefined recipient groups.
            </div>
          </div>
        </Card>
      )}

      {/* Recipient Count Estimate */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900">Estimated Recipients</h4>
            <p className="text-sm text-gray-600">
              Based on current {value.recipientType.replace("_", " ")} with active
              email status
            </p>
          </div>
          <Badge size="xl" color="info">
            <span className="text-2xl font-bold">{estimatedRecipients}</span>
          </Badge>
        </div>
        
        {estimatedRecipients === 0 && value.recipientType !== "custom" && (
          <div className="mt-3 rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
            ⚠️ No recipients found matching this criteria. Make sure your event has
            registered attendees or speakers before sending a campaign.
          </div>
        )}
      </Card>

      {/* Recipient Type Descriptions */}
      <Card>
        <div className="space-y-3 text-sm">
          <h4 className="font-semibold text-gray-900">About Recipient Groups</h4>
          
          <div>
            <p className="font-medium text-gray-900">📧 All Attendees</p>
            <p className="text-gray-600">
              Sends to everyone who has registered for your event (excludes bounced
              emails)
            </p>
          </div>
          
          <div>
            <p className="font-medium text-gray-900">🎫 Specific Ticket Type</p>
            <p className="text-gray-600">
              Target attendees who purchased a specific ticket type (e.g., VIP,
              Early Bird)
            </p>
          </div>
          
          <div>
            <p className="font-medium text-gray-900">🎤 All Speakers</p>
            <p className="text-gray-600">
              Sends to all speakers who are part of your event lineup
            </p>
          </div>
          
          <div>
            <p className="font-medium text-gray-900">✏️ Custom List</p>
            <p className="text-gray-600">
              Manually specify email addresses (useful for sponsors, volunteers, or
              specific groups)
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
