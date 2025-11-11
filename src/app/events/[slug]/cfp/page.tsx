/**
 * Public CFP Submission Page
 * Public-facing page for speakers to submit session proposals
 * FR-029: Public CFP form, FR-030: Deadline enforcement
 */

import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import { CfpPublicContent } from "./cfp-public-content";

interface CfpPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CfpPage({ params }: CfpPageProps) {
  const { slug } = await params;

  // Fetch event
  const event = await api.event.getBySlug({ slug });

  if (!event) {
    redirect("/events");
  }

  // Fetch CFP data for the event
  const cfp = await api.cfp.getPublicCfp({ eventSlug: slug });

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-12">
      {/* Event Header */}
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white">
          Call for Papers
        </h1>
        <h2 className="text-xl text-gray-600 dark:text-gray-400">
          {event.name}
        </h2>
        <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm text-gray-600 dark:text-gray-400">
          <span className="rounded-lg bg-gray-100 px-3 py-1 dark:bg-gray-800">
            📅{" "}
            {new Date(event.startDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="rounded-lg bg-gray-100 px-3 py-1 dark:bg-gray-800">
            🕒 {event.timezone}
          </span>
        </div>
      </div>

      {/* CFP Content */}
      <CfpPublicContent cfp={cfp} eventId={event.id} eventName={event.name} />
    </div>
  );
}
