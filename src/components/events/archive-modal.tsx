"use client";

/**
 * ArchiveModal Component
 * Confirmation modal for archiving events with impact summary
 */

import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "flowbite-react";
import { LuTriangleAlert } from "react-icons/lu";
import { HiOutlineArchive } from "react-icons/hi";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ArchiveModalProps {
  eventId: string;
  eventName: string;
  isOpen: boolean;
  onClose: () => void;
  impact: {
    registrations: number;
    ticketTypes: number;
    scheduleEntries: number;
    speakers: number;
    emailCampaigns: number;
  };
}

export function ArchiveModal({
  eventId,
  eventName,
  isOpen,
  onClose,
  impact,
}: ArchiveModalProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const archiveMutation = api.event.archive.useMutation({
    onSuccess: () => {
      router.refresh();
      onClose();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleArchive = () => {
    setError(null);
    archiveMutation.mutate({ id: eventId });
  };

  return (
    <Modal show={isOpen} onClose={onClose} size="md">
      <ModalHeader>
        <div className="flex items-center gap-2">
          <HiOutlineArchive className="text-warning-600 h-5 w-5" />
          <span>Archive Event</span>
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
            <div className="flex gap-3">
              <LuTriangleAlert className="h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-400">
                  Are you sure you want to archive &quot;{eventName}&quot;?
                </h4>
                <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  Archiving this event will hide it from public view. You can
                  restore it later if needed.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-medium text-gray-900 dark:text-white">
              This event contains:
            </h4>
            <div className="space-y-2">
              <ImpactItem
                label="Registered attendees"
                count={impact.registrations}
              />
              <ImpactItem label="Ticket types" count={impact.ticketTypes} />
              <ImpactItem
                label="Schedule entries"
                count={impact.scheduleEntries}
              />
              <ImpactItem label="Speakers" count={impact.speakers} />
              <ImpactItem
                label="Email campaigns"
                count={impact.emailCampaigns}
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Note:</strong> All data will be preserved. Archived events
              can be restored from your dashboard at any time.
            </p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <div className="flex w-full gap-2">
          <Button
            color="warning"
            onClick={handleArchive}
            disabled={archiveMutation.isPending}
            className="flex-1"
          >
            {archiveMutation.isPending ? "Archiving..." : "Archive Event"}
          </Button>
          <Button
            color="gray"
            onClick={onClose}
            disabled={archiveMutation.isPending}
          >
            Cancel
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}

function ImpactItem({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2 dark:border-gray-700">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <span className="font-semibold text-gray-900 dark:text-white">
        {count}
      </span>
    </div>
  );
}
