"use client";

import { Badge, Button, Card } from "flowbite-react";
import { HiMail, HiClock, HiCheckCircle, HiXCircle } from "react-icons/hi";
import { formatDistanceToNow } from "date-fns";

interface CampaignCardProps {
  campaign: {
    id: string;
    subject: string;
    recipientType: string;
    status: string;
    totalRecipients: number | null;
    delivered: number;
    bounces: number;
    opens: number;
    clicks: number;
    sentAt: Date | null;
    scheduledFor: Date | null;
    createdAt: Date;
  };
  onView?: () => void;
  onEdit?: () => void;
  onSend?: () => void;
  onSchedule?: () => void;
}

export function CampaignCard({
  campaign,
  onView,
  onEdit,
  onSend,
  onSchedule,
}: CampaignCardProps) {
  const getStatusBadge = () => {
    switch (campaign.status) {
      case "draft":
        return (
          <Badge color="gray" icon={HiClock}>
            Draft
          </Badge>
        );
      case "scheduled":
        return (
          <Badge color="info" icon={HiClock}>
            Scheduled
          </Badge>
        );
      case "sending":
        return (
          <Badge color="warning" icon={HiMail}>
            Sending
          </Badge>
        );
      case "sent":
        return (
          <Badge color="success" icon={HiCheckCircle}>
            Sent
          </Badge>
        );
      case "failed":
        return (
          <Badge color="failure" icon={HiXCircle}>
            Failed
          </Badge>
        );
      default:
        return <Badge>{campaign.status}</Badge>;
    }
  };

  const getRecipientTypeLabel = () => {
    switch (campaign.recipientType) {
      case "all_attendees":
        return "All Attendees";
      case "ticket_type":
        return "Specific Ticket Type";
      case "speakers":
        return "All Speakers";
      case "custom":
        return "Custom List";
      default:
        return campaign.recipientType;
    }
  };

  const showStats = campaign.status === "sent" && campaign.totalRecipients;
  const deliveryRate = showStats
    ? Math.round((campaign.delivered / campaign.totalRecipients!) * 100)
    : 0;
  const openRate =
    showStats && campaign.delivered > 0
      ? Math.round((campaign.opens / campaign.delivered) * 100)
      : 0;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {campaign.subject}
            </h3>
            {getStatusBadge()}
          </div>

          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            <span>📧 {getRecipientTypeLabel()}</span>
            {campaign.totalRecipients !== null && (
              <span>👥 {campaign.totalRecipients} recipients</span>
            )}
          </div>

          {campaign.scheduledFor && campaign.status === "scheduled" && (
            <div className="mt-2 text-sm text-blue-600">
              ⏰ Scheduled for{" "}
              {new Date(campaign.scheduledFor).toLocaleDateString()}{" "}
              {new Date(campaign.scheduledFor).toLocaleTimeString()}
            </div>
          )}

          {campaign.sentAt && (
            <div className="mt-2 text-sm text-gray-500">
              Sent{" "}
              {formatDistanceToNow(new Date(campaign.sentAt), {
                addSuffix: true,
              })}
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      {showStats && (
        <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-gray-600">Delivered</p>
            <p className="text-2xl font-bold text-gray-900">
              {campaign.delivered}
            </p>
            <p className="text-xs text-gray-500">{deliveryRate}% rate</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Opens</p>
            <p className="text-2xl font-bold text-blue-600">{campaign.opens}</p>
            <p className="text-xs text-gray-500">{openRate}% rate</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Clicks</p>
            <p className="text-2xl font-bold text-green-600">
              {campaign.clicks}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Bounces</p>
            <p className="text-2xl font-bold text-red-600">
              {campaign.bounces}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {onView && (
          <Button size="sm" color="light" onClick={onView}>
            View Details
          </Button>
        )}

        {campaign.status === "draft" && onEdit && (
          <Button size="sm" color="light" onClick={onEdit}>
            Edit
          </Button>
        )}

        {campaign.status === "draft" && onSend && (
          <Button size="sm" onClick={onSend}>
            Send Now
          </Button>
        )}

        {campaign.status === "draft" && onSchedule && (
          <Button size="sm" color="info" onClick={onSchedule}>
            Schedule
          </Button>
        )}
      </div>
    </Card>
  );
}
