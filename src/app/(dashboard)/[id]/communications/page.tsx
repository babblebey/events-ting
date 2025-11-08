"use client";

import { use, useState } from "react";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from "flowbite-react";
import { HiPlus } from "react-icons/hi";
import { api } from "@/trpc/react";
import { CampaignCard } from "@/components/communications/campaign-card";
import { CampaignEditor } from "@/components/communications/campaign-editor";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "@/server/api/root";

interface CommunicationsPageProps {
  params: Promise<{
    id: string;
  }>;
}

function CommunicationsPage({ params }: CommunicationsPageProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | undefined>();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingCampaignId, setSchedulingCampaignId] = useState<string | undefined>();
  const [scheduledDate, setScheduledDate] = useState("");

  const { id: eventId } = use(params);

  // Fetch campaigns
  const { data: campaigns, isLoading } = api.communication.listCampaigns.useQuery({
    eventId,
    limit: 50,
  });

  const utils = api.useUtils();

  // Send campaign mutation
  const sendMutation = api.communication.sendCampaign.useMutation({
    onSuccess: () => {
      void utils.communication.listCampaigns.invalidate();
      alert("Campaign sent successfully!");
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      alert(`Failed to send campaign: ${error.message}`);
    },
  });

  // Schedule campaign mutation
  const scheduleMutation = api.communication.scheduleCampaign.useMutation({
    onSuccess: () => {
      void utils.communication.listCampaigns.invalidate();
      setShowScheduleModal(false);
      setSchedulingCampaignId(undefined);
      setScheduledDate("");
      alert("Campaign scheduled successfully!");
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      alert(`Failed to schedule campaign: ${error.message}`);
    },
  });

  const handleCreateNew = () => {
    setEditingCampaignId(undefined);
    setShowEditor(true);
  };

  const handleEdit = (campaignId: string) => {
    setEditingCampaignId(campaignId);
    setShowEditor(true);
  };

  const handleSend = (campaignId: string) => {
    if (confirm("Are you sure you want to send this campaign? This action cannot be undone.")) {
      sendMutation.mutate({ id: campaignId });
    }
  };

  const handleSchedule = (campaignId: string) => {
    setSchedulingCampaignId(campaignId);
    setShowScheduleModal(true);
  };

  const handleScheduleSubmit = () => {
    if (!schedulingCampaignId || !scheduledDate) return;

    scheduleMutation.mutate({
      id: schedulingCampaignId,
      scheduledFor: new Date(scheduledDate),
    });
  };

  const handleEditorSuccess = () => {
    setShowEditor(false);
    setEditingCampaignId(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email Campaigns</h1>
          <p className="mt-2 text-gray-600">
            Send email communications to your attendees, speakers, or specific groups
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <HiPlus className="mr-2 h-5 w-5" />
          New Campaign
        </Button>
      </div>

      {/* Campaign List */}
      {isLoading && (
        <div className="text-center text-gray-500">Loading campaigns...</div>
      )}

      {!isLoading && campaigns?.items.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <HiPlus className="h-8 w-8 text-blue-600 dark:text-blue-300" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">No campaigns yet</h3>
          <p className="mb-6 mt-2 text-gray-600">
            Create your first email campaign to communicate with your attendees
          </p>
          <Button className="m-auto" onClick={handleCreateNew}>
            <HiPlus className="mr-2 h-5 w-5" />
            Create Campaign
          </Button>
        </div>
      )}

      {!isLoading && (campaigns?.items.length ?? 0) > 0 && (
        <div className="space-y-4">
          {campaigns?.items.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={() => handleEdit(campaign.id)}
              onSend={() => handleSend(campaign.id)}
              onSchedule={() => handleSchedule(campaign.id)}
            />
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <Modal show={showEditor} onClose={() => setShowEditor(false)} size="4xl">
        <ModalHeader>
          {editingCampaignId ? "Edit Campaign" : "Create New Campaign"}
        </ModalHeader>
        <ModalBody>
          <CampaignEditor
            eventId={eventId}
            campaignId={editingCampaignId}
            onSuccess={handleEditorSuccess}
          />
        </ModalBody>
      </Modal>

      {/* Schedule Modal */}
      <Modal show={showScheduleModal} onClose={() => setShowScheduleModal(false)}>
        <ModalHeader>Schedule Campaign</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="scheduledDate"
                className="mb-2 block text-sm font-medium text-gray-900"
              >
                Send Date & Time
              </label>
              <input
                type="datetime-local"
                id="scheduledDate"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-semibold">📅 Scheduling Notes</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Campaign will be sent automatically at the scheduled time</li>
                <li>Make sure the date/time is in your local timezone</li>
                <li>You can cancel scheduled campaigns before they are sent</li>
              </ul>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button onClick={handleScheduleSubmit} disabled={!scheduledDate}>
            Schedule Campaign
          </Button>
          <Button color="gray" onClick={() => setShowScheduleModal(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default CommunicationsPage;