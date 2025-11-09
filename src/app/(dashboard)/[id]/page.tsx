/**
 * Event Overview Page
 * Dashboard displaying metrics and quick actions for an event
 */

import Link from "next/link";
import { Suspense } from "react";
import { api } from "@/trpc/server";
import { Button, Card } from "flowbite-react";
import { HiOutlineUsers } from "react-icons/hi2";
import { IoSettingsOutline } from "react-icons/io5";
import { formatDate, formatDateRange } from "@/lib/utils/date";
import { EventMetrics, EventMetricsSkeleton } from "@/components/events/event-metrics";
import { HiOutlineTicket, HiOutlineMail, HiOutlineExternalLink, HiOutlineCalendar } from "react-icons/hi";

interface EventOverviewPageProps {
  params: { id: string };
}

export default async function EventOverviewPage({
  params,
}: EventOverviewPageProps) {
  const event = await api.event.getById({ id: params.id });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {event.name}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {formatDateRange(event.startDate, event.endDate, event.timezone)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/events/${event.slug}`}>
            <Button color="gray">
              <HiOutlineExternalLink className="mr-2 h-4 w-4" />
              View Public Page
            </Button>
          </Link>
          <Link href={`/${params.id}/settings`}>
            <Button>
              <IoSettingsOutline className="mr-2 h-4 w-4" />
              Event Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Event Status Card */}
      <Card>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              Status
            </h3>
            <p className="text-lg font-semibold text-gray-900 capitalize dark:text-white">
              {event.status}
              {event.isArchived && " (Archived)"}
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              Location
            </h3>
            <p className="text-lg font-semibold text-gray-900 capitalize dark:text-white">
              {event.locationType}
            </p>
            {event.locationAddress && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {event.locationAddress}
              </p>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              Timezone
            </h3>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {event.timezone}
            </p>
          </div>
        </div>
      </Card>

      {/* Metrics */}
      <Suspense fallback={<EventMetricsSkeleton />}>
        <EventMetricsSection eventId={params.id} />
      </Suspense>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickActionCard
          href={`/${params.id}/tickets`}
          title="Manage Tickets"
          description="Create and manage ticket types"
          icon={<HiOutlineTicket className="h-6 w-6" />}
        />
        <QuickActionCard
          href={`/${params.id}/attendees`}
          title="View Attendees"
          description="See who's registered"
          icon={<HiOutlineUsers className="h-6 w-6" />}
        />
        <QuickActionCard
          href={`/${params.id}/schedule`}
          title="Build Schedule"
          description="Add sessions and speakers"
          icon={<HiOutlineCalendar className="h-6 w-6" />}
        />
        <QuickActionCard
          href={`/${params.id}/communications`}
          title="Send Email"
          description="Communicate with attendees"
          icon={<HiOutlineMail className="h-6 w-6" />}
        />
      </div>
    </div>
  );
}

async function EventMetricsSection({ eventId }: { eventId: string }) {
  const metrics = await api.event.getMetrics({ id: eventId });

  return <EventMetrics metrics={metrics} recentRegistrations={metrics.recentRegistrations} />;
}

function QuickActionCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer hover:shadow-lg transition-shadow">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary-100 p-3 text-primary-600 dark:bg-primary-900 dark:text-primary-300">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

