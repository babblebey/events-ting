/**
 * Public Speakers Directory Page
 * Server Component displaying all speakers for an event
 */

import { api } from "@/trpc/server";
import { SpeakerCard } from "@/components/speakers/speaker-card";
import { notFound } from "next/navigation";
import { LuCircleAlert } from "react-icons/lu";
import { Alert } from "flowbite-react";

interface SpeakersPageProps {
  params: {
    slug: string;
  };
}

export default async function SpeakersPage({ params }: SpeakersPageProps) {
  // Fetch event to get ID
  const event = await api.event.getBySlug({ slug: params.slug });

  if (!event) {
    notFound();
  }

  // Fetch speakers
  let speakers;
  try {
    speakers = await api.speaker.getByEvent({ eventId: event.id });
  } catch (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Alert color="failure" icon={LuCircleAlert}>
          <span className="font-medium">Error loading speakers</span>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Speakers
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Meet the experts speaking at {event.name}
        </p>
      </div>

      {/* Empty State */}
      {speakers.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No speakers announced yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Check back soon for speaker announcements
          </p>
        </div>
      )}

      {/* Speakers Grid */}
      {speakers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {speakers.map((speaker) => (
            <SpeakerCard
              key={speaker.id}
              speaker={speaker}
              eventSlug={params.slug}
              showSessions={true}
            />
          ))}
        </div>
      )}

      {/* Stats */}
      {speakers.length > 0 && (
        <div className="mt-12 border-t pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {speakers.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Expert Speakers
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {speakers.reduce(
                  (acc, speaker) => acc + (speaker.speakerSessions?.length ?? 0),
                  0
                )}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Sessions
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {new Set(
                  speakers.flatMap((s) =>
                    s.speakerSessions?.map((ss) => ss.scheduleEntry.track).filter(Boolean) ?? []
                  )
                ).size}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Different Tracks
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Metadata for SEO
 */
export async function generateMetadata({ params }: SpeakersPageProps) {
  const event = await api.event.getBySlug({ slug: params.slug });

  if (!event) {
    return {
      title: "Speakers Not Found",
    };
  }

  return {
    title: `Speakers - ${event.name}`,
    description: `Meet the speakers at ${event.name}`,
  };
}
