"use client";

/**
 * ScheduleManager Component
 * Client component for managing event schedule with add/edit/delete functionality
 */

import { useState } from "react";
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "flowbite-react";
import { ScheduleTimeline } from "@/components/schedule/schedule-timeline";
import { ScheduleEntryForm } from "@/components/schedule/schedule-entry-form";
import { api } from "@/trpc/react";
import { HiPlus } from "react-icons/hi";
import { extractDateString, extractTimeString } from "@/lib/utils/date";
import type { RouterOutputs } from "@/trpc/react";

type ScheduleEntry = RouterOutputs["schedule"]["list"][number];

interface Track {
  name: string;
  color: string;
}

interface ScheduleManagerProps {
  eventId: string;
  eventTimezone: string;
  initialEntries: ScheduleEntry[];
  initialTracks: Track[];
}

export function ScheduleManager({
  eventId,
  eventTimezone,
  initialEntries,
  initialTracks,
}: ScheduleManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const utils = api.useUtils();

  // Query for entries (with initial data)
  const { data: entries = initialEntries } = api.schedule.list.useQuery(
    { eventId },
    {
      initialData: initialEntries,
      refetchOnMount: false,
    },
  );

  // Query for tracks
  const { data: tracks = initialTracks } = api.schedule.getTracks.useQuery(
    { id: eventId },
    {
      initialData: initialTracks,
      refetchOnMount: false,
    },
  );

  // Delete mutation
  const deleteMutation = api.schedule.delete.useMutation({
    onSuccess: () => {
      void utils.schedule.list.invalidate({ eventId });
      void utils.schedule.getTracks.invalidate({ id: eventId });
      setShowDeleteConfirm(false);
      setDeletingEntryId(null);
    },
  });

  const handleAdd = () => {
    setEditingEntry(null);
    setShowForm(true);
  };

  const handleEdit = (entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (entry) {
      setEditingEntry(entry);
      setShowForm(true);
    }
  };

  const handleDelete = (entryId: string) => {
    setDeletingEntryId(entryId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deletingEntryId) {
      deleteMutation.mutate({ id: deletingEntryId });
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEntry(null);
    void utils.schedule.list.invalidate({ eventId });
    void utils.schedule.getTracks.invalidate({ id: eventId });
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  return (
    <div className="space-y-6">
      {/* Add Button */}
      <div className="flex justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {entries.length} session{entries.length !== 1 ? "s" : ""} scheduled
        </div>
        <Button size="sm" onClick={handleAdd}>
          <HiPlus className="mr-2 h-5 w-5" />
          Add Session
        </Button>
      </div>

      {/* Timeline View */}
      <ScheduleTimeline
        entries={entries}
        timezone={eventTimezone}
        tracks={tracks}
        onEdit={handleEdit}
        onDelete={handleDelete}
        showActions
      />

      {/* Add/Edit Modal */}
      <Modal show={showForm} onClose={handleFormCancel} size="3xl">
        <ModalHeader>
          {editingEntry ? "Edit Schedule Entry" : "Add Schedule Entry"}
        </ModalHeader>
        <ModalBody>
          <ScheduleEntryForm
            eventId={eventId}
            eventTimezone={eventTimezone}
            initialData={
              editingEntry
                ? {
                    id: editingEntry.id,
                    title: editingEntry.title,
                    description: editingEntry.description,
                    date: extractDateString(
                      editingEntry.startTime,
                      eventTimezone,
                    ),
                    startTime: extractTimeString(
                      editingEntry.startTime,
                      eventTimezone,
                    ),
                    endTime: extractTimeString(
                      editingEntry.endTime,
                      eventTimezone,
                    ),
                    location: editingEntry.location ?? undefined,
                    track: editingEntry.track ?? undefined,
                    trackColor: editingEntry.trackColor ?? undefined,
                    sessionType: editingEntry.sessionType ?? undefined,
                    speakerIds: editingEntry.speakerSessions.map(
                      (ss) => ss.speaker.id,
                    ),
                    updatedAt: editingEntry.updatedAt,
                  }
                : undefined
            }
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </ModalBody>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        size="md"
      >
        <ModalHeader>Confirm Deletion</ModalHeader>
        <ModalBody>
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete this schedule entry? This action
            cannot be undone.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            color="red"
            onClick={confirmDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
          <Button color="gray" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
