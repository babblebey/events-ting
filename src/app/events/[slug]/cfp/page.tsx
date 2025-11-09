/**
 * Public CFP Submission Page
 * Public-facing page for speakers to submit session proposals
 * FR-029: Public CFP form, FR-030: Deadline enforcement
 */

import { redirect } from "next/navigation";
import { api } from "@/trpc/server";

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

  // Check if event has a CFP - we need to add a procedure for this
  // For now, we'll try to get submissions which will fail if no CFP exists
  let cfp = null;
  let cfpId = null;

  try {
    // This is a workaround since we don't have a getCfp procedure
    // We'll need to add that procedure or pass CFP data differently
    // For now, we'll handle this in the component
  } catch {
    // No CFP exists
  }

  // Since we don't have a direct getCfp procedure, we'll need to handle this differently
  // Let's create a simple page that shows appropriate messaging

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

      {/* CFP Content - This will be handled by a client component that fetches CFP data */}
      <CfpPublicContent eventId={event.id} eventName={event.name} />
    </div>
  );
}

/**
 * Client component to handle CFP data fetching and display
 * This is needed because we need to call tRPC from client side
 */
import { CfpPublicContent } from "./cfp-public-content";
