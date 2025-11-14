"use client";

import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

function TicketsPage() {
  const params = useParams();
  const eventId = params.id as string;

  // Fetch event data for breadcrumbs
  const { data: event } = api.event.getById.useQuery({ id: eventId });

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      {event && (
        <Breadcrumbs
          items={[
            { label: event.name, href: `/${eventId}` },
            { label: "Tickets" },
          ]}
        />
      )}

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Tickets
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage ticket types and pricing for your event
        </p>
      </div>
    </div>
  );
}

export default TicketsPage;
