/**
 * Attendee Check-In Page
 * Server Component for event team members to check in attendees
 *
 * Features:
 * - Search attendees by ticket number
 * - Filter by check-in status
 * - Manual check-in operations
 * - Check-in metrics display
 *
 * @requires CHECKIN module permission
 */

import { api } from "@/trpc/server";
import { notFound } from "next/navigation";
import { Alert } from "flowbite-react";
import { LuCircleAlert } from "react-icons/lu";
import {
  AttendeeList,
  SearchBar,
  CheckInFilters,
  CheckInMetrics,
  QrScannerWrapper,
} from "@/components/check-in";

interface CheckInPageProps {
  params: {
    slug: string;
  };
  searchParams: {
    search?: string;
    filter?: "all" | "checked-in" | "not-checked-in";
    page?: string;
  };
}

export default async function CheckInPage({
  params,
  searchParams,
}: CheckInPageProps) {
  // Fetch event to get ID
  const event = await api.event.getBySlug({ slug: params.slug });

  if (!event) {
    notFound();
  }

  // Parse search params
  const filter = searchParams.filter ?? "all";
  const search = searchParams.search ?? undefined;
  const page = parseInt(searchParams.page ?? "0", 10);

  // Fetch attendees with check-in status
  let attendeesData;
  let metricsData;
  let permissionError = false;

  try {
    // Fetch attendees and metrics in parallel
    [attendeesData, metricsData] = await Promise.all([
      api.checkIn.listAttendees({
        eventId: event.id,
        filter: filter,
        search,
        page,
        pageSize: 50,
      }),
      api.checkIn.getMetrics({
        eventId: event.id,
      }),
    ]);
  } catch (error) {
    // Check for permission error
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "FORBIDDEN"
    ) {
      permissionError = true;
    } else {
      // Re-throw other errors
      throw error;
    }
  }

  // Show permission error
  if (permissionError) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <Alert color="failure" icon={LuCircleAlert}>
          <span className="font-medium">Access Denied</span>
          <p className="mt-1 text-sm">
            You don&apos;t have permission to access the check-in module for
            this event. Please contact the event owner to request access.
          </p>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
          Attendee Check-In
        </h1>
        <p className="mt-2 text-sm text-gray-600 sm:text-base dark:text-gray-400">
          Check in attendees for {event.name}
        </p>
      </div>

      {/* Metrics Section */}
      {metricsData && (
        <div className="mb-6 sm:mb-8">
          <CheckInMetrics
            totalTickets={metricsData.totalTickets}
            checkedInCount={metricsData.checkedInCount}
            notCheckedInCount={metricsData.notCheckedInCount}
            checkInPercentage={metricsData.checkInPercentage}
            recentCheckIns={metricsData.recentCheckIns}
          />
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-1">
            <SearchBar defaultValue={search} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1 sm:flex-none">
              <QrScannerWrapper eventId={event.id} />
            </div>
            <div className="w-full sm:w-48">
              <CheckInFilters defaultValue={filter} />
            </div>
          </div>
        </div>
      </div>

      {/* Attendee List */}
      {attendeesData && (
        <AttendeeList
          eventId={event.id}
          eventSlug={params.slug}
          initialData={attendeesData}
          currentPage={page}
          currentFilter={filter}
          currentSearch={search}
        />
      )}
    </div>
  );
}

/**
 * Metadata for SEO
 */
export async function generateMetadata({ params }: CheckInPageProps) {
  const event = await api.event.getBySlug({ slug: params.slug });

  if (!event) {
    return {
      title: "Check-In Not Found",
    };
  }

  return {
    title: `Check-In - ${event.name}`,
    description: `Check in attendees for ${event.name}`,
  };
}
