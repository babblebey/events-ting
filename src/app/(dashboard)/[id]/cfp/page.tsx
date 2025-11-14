/**
 * CFP Management Page
 * Dashboard page for organizers to manage Call for Papers
 * FR-026: Open/close CFP, FR-031: Review submissions, FR-033-035: Accept/reject proposals
 */

import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import { auth } from "@/server/auth";
import { CfpManager } from "./cfp-manager";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

interface CfpPageProps {
  params: Promise<{ id: string }>;
}

export default async function CfpPage({ params }: CfpPageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  // Fetch event to verify ownership
  const event = await api.event.getById({ id });

  if (!event) {
    redirect("/events");
  }

  // Verify user is the organizer
  if (event.organizerId !== session.user.id) {
    redirect(`/events/${event.slug}`);
  }

  // Fetch CFP if it exists
  const cfp = await api.cfp.getCfpByEventId({ eventId: id });

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: event.name, href: `/${id}` },
          { label: "Call for Papers" },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Call for Papers
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage session proposals and review submissions
        </p>
      </div>

      <CfpManager
        eventId={id}
        eventName={event.name}
        eventSlug={event.slug}
        initialCfp={cfp}
      />
    </div>
  );
}
