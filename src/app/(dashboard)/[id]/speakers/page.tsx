"use client";

/**
 * Speakers Management Page
 * Dashboard page for managing event speakers
 */

import { useState } from "react";
import { Button, Alert, Spinner } from "flowbite-react";
import { LuCircleAlert } from "react-icons/lu";
import { HiPlus } from "react-icons/hi";
import { api } from "@/trpc/react";
import { SpeakerCard } from "@/components/speakers/speaker-card";
import { SpeakerForm } from "@/components/speakers/speaker-form";
import { useParams } from "next/navigation";

export default function SpeakersPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [deletingSpeaker, setDeletingSpeaker] = useState<string | null>(null);

  // Fetch speakers
  const { data: speakers, isLoading, error, refetch } = api.speaker.list.useQuery({
    eventId,
  });

  // Delete mutation
  const deleteMutation = api.speaker.delete.useMutation({
    onSuccess: () => {
      setDeletingSpeaker(null);
      void refetch();
    },
  });

  const handleAddSuccess = () => {
    setShowAddModal(false);
    void refetch();
  };

  const handleEditSuccess = () => {
    setEditingSpeaker(null);
    void refetch();
  };

  const handleDelete = (speakerId: string) => {
    deleteMutation.mutate({ id: speakerId });
  };

  if (error) {
    return (
      <div className="p-6">
        <Alert color="failure" icon={LuCircleAlert}>
          <span className="font-medium">Error loading speakers:</span> {error.message}
        </Alert>
      </div>
    );
  }

  const editingSpeakerData = speakers?.find((s) => s.id === editingSpeaker);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Speakers
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage speaker profiles and session assignments
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <HiPlus className="mr-2 h-5 w-5" />
          Add Speaker
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Spinner size="xl" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && speakers?.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">  
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <HiPlus className="h-8 w-8 text-blue-600 dark:text-blue-300" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Speakers Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Get started by adding your first speaker or accepting CFP submissions
          </p>
          <Button onClick={() => setShowAddModal(true)} className="m-auto">
            <HiPlus className="mr-2 h-5 w-5" />
            Add Speaker
          </Button>
        </div>
      )}

      {/* Speakers Grid */}
      {!isLoading && speakers && speakers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {speakers.map((speaker) => (
            <SpeakerCard
              key={speaker.id}
              speaker={speaker}
              showSessions={true}
              onEdit={() => setEditingSpeaker(speaker.id)}
              onDelete={() => setDeletingSpeaker(speaker.id)}
            />
          ))}
        </div>
      )}

      {/* Add Speaker Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              Add Speaker
            </h2>
            <SpeakerForm
              eventId={eventId}
              onSuccess={handleAddSuccess}
              onCancel={() => setShowAddModal(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Speaker Modal */}
      {editingSpeaker && editingSpeakerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              Edit Speaker
            </h2>
            <SpeakerForm
              eventId={eventId}
              initialData={{
                id: editingSpeakerData.id,
                name: editingSpeakerData.name,
                bio: editingSpeakerData.bio,
                email: editingSpeakerData.email,
                photo: editingSpeakerData.photo ?? undefined,
                twitter: editingSpeakerData.twitter ?? undefined,
                github: editingSpeakerData.github ?? undefined,
                linkedin: editingSpeakerData.linkedin ?? undefined,
                website: editingSpeakerData.website ?? undefined,
              }}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingSpeaker(null)}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSpeaker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              Delete Speaker
            </h2>
            <div className="space-y-4">
              <Alert color="warning" icon={AlertCircle}>
                <span className="font-medium">Warning:</span> This will also remove the
                speaker from all assigned sessions. This action cannot be undone.
              </Alert>
              <p className="text-gray-600 dark:text-gray-300">
                Are you sure you want to delete this speaker?
              </p>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <Button
                color="gray"
                onClick={() => setDeletingSpeaker(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                color="failure"
                onClick={() => deletingSpeaker && handleDelete(deletingSpeaker)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Speaker"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
