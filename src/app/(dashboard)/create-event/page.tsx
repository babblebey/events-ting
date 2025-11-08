/**
 * Create Event Page
 * Protected route for creating new events
 */

import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { EventForm } from "@/components/events/event-form";

export const metadata = {
  title: "Create Event | Events Ting",
  description: "Create a new event",
};

export default async function CreateEventPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create New Event
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Fill in the details below to create your event
          </p>
        </div>

        <EventForm />
      </div>
    </div>
  );
}
