/**
 * Events Dashboard Component
 * Client component for displaying and managing user's events
 * This is a placeholder for Phase 1 - full implementation in Phase 3
 */

"use client";

import Link from "next/link";

interface Event {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  timezone: string;
  locationType: string;
  locationAddress: string | null;
  locationUrl: string | null;
  status: string;
  isArchived: boolean;
  organizer: {
    id: string;
    name: string | null;
    image: string | null;
  };
  _count: {
    registrations: number;
    ticketTypes: number;
  };
}

interface EventsDashboardProps {
  initialEvents: {
    events: Event[];
    nextCursor?: string;
  };
}

export function EventsDashboard({ initialEvents }: EventsDashboardProps) {
  const { events } = initialEvents;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Events</h1>
        <p className="text-gray-600 mt-2">Manage all your events in one place</p>
      </div>

      {/* Placeholder: Will be replaced with proper components in Phase 3 */}
      {events.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📅</div>
          <h2 className="text-2xl font-bold mb-2">Create Your First Event</h2>
          <p className="text-gray-600 mb-6">
            Start managing amazing events with Events Ting. It takes just a few minutes to get started.
          </p>
          <Link
            href="/create-event"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Create Your First Event
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {events.map((event) => (
            <div key={event.id} className="border rounded-lg p-6 hover:shadow-lg transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold mb-2">{event.name}</h3>
                  <p className="text-gray-600 mb-4">
                    {event.description ?? "No description"}
                  </p>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>📅 {new Date(event.startDate).toLocaleDateString()}</span>
                    <span>📍 {event.locationType}</span>
                    <span>👥 {event._count.registrations} attendees</span>
                  </div>
                </div>
                <div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      event.status === "published"
                        ? "bg-green-100 text-green-800"
                        : event.status === "draft"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {event.status}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <a
                  href={`/${event.id}`}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  Manage
                </a>
                <a
                  href={`/${event.id}/settings`}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
                >
                  Edit
                </a>
                <a
                  href={`/events/${event.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 px-4 py-2 rounded hover:bg-blue-50 transition"
                >
                  View Event
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
