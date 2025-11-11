/**
 * Event Settings Page
 * Page for editing event details
 */

import { api } from "@/trpc/server";
import { EventForm } from "@/components/events/event-form";
import { Button, Card } from "flowbite-react";
import { LuRotateCcw } from "react-icons/lu";
import { HiOutlineTrash, HiOutlineArchive } from "react-icons/hi";
import Link from "next/link";

interface EventSettingsPageProps {
  params: { id: string };
}

export default async function EventSettingsPage({
  params,
}: EventSettingsPageProps) {
  const event = await api.event.getById({ id: params.id });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Event Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Update your event details and manage settings
        </p>
      </div>

      {/* Event Form */}
      <Card>
        <EventForm
          initialData={{
            id: event.id,
            name: event.name,
            description: event.description,
            slug: event.slug,
            locationType: event.locationType as
              | "in-person"
              | "virtual"
              | "hybrid",
            locationAddress: event.locationAddress ?? undefined,
            locationUrl: event.locationUrl ?? undefined,
            timezone: event.timezone,
            startDate: event.startDate,
            endDate: event.endDate,
            status: event.status as "draft" | "published" | "archived",
          }}
        />
      </Card>

      {/* Danger Zone */}
      <Card>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
              Danger Zone
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Irreversible and destructive actions
            </p>
          </div>

          <div className="space-y-3">
            {!event.isArchived ? (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Archive Event
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Hide this event from public view (can be restored later)
                  </p>
                </div>
                <Link href={`/${params.id}/archive`}>
                  <Button color="yellow">
                    <HiOutlineArchive className="mr-2 h-4 w-4" />
                    Archive
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Restore Event
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Make this event accessible again
                  </p>
                </div>
                <Link href={`/${params.id}/restore`}>
                  <Button color="green">
                    <LuRotateCcw className="mr-2 h-4 w-4" />
                    Restore
                  </Button>
                </Link>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border border-red-200 p-4 dark:border-red-800">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Delete Event Permanently
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This action cannot be undone. All data will be lost.
                </p>
              </div>
              <Link href={`/${params.id}/delete`}>
                <Button color="red">
                  <HiOutlineTrash className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
