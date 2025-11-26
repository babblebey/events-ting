"use client";

/**
 * CheckInMetrics Component
 * Displays check-in statistics and recent activity
 * Client Component with reactive data fetching for real-time updates
 */

import { Card, Progress, Badge } from "flowbite-react";
import { HiTicket, HiCheck, HiClock, HiTrendingUp } from "react-icons/hi";
import { formatEventTime } from "@/lib/utils/date";
import { api } from "@/trpc/react";
import { CheckInMetricsSkeleton } from "./check-in-metrics-skeleton";

// Type definitions from contracts
type RecentCheckIn = {
  ticketNumber: string;
  name: string;
  checkedInAt: Date;
};

type MetricsData = {
  totalTickets: number;
  checkedInCount: number;
  notCheckedInCount: number;
  checkInPercentage: number;
  recentCheckIns: RecentCheckIn[];
};

interface CheckInMetricsProps {
  eventId: string;
  eventTimezone: string;
  initialData: MetricsData;
}

export function CheckInMetrics({
  eventId,
  eventTimezone,
  initialData,
}: CheckInMetricsProps) {
  // Fetch metrics with tRPC query for reactive updates
  const { data, isLoading } = api.checkIn.getMetrics.useQuery(
    { eventId },
    {
      initialData,
      refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
    },
  );

  const formatDateTime = (date: Date) => {
    // Format in event timezone: "11/24/25, 2:30 PM EST"
    return formatEventTime(new Date(date), eventTimezone, "M/d/yy, h:mm a zzz");
  };

  // Use data from query or fallback to initial data
  const totalTickets = data?.totalTickets ?? initialData.totalTickets;
  const checkedInCount = data?.checkedInCount ?? initialData.checkedInCount;
  const notCheckedInCount = data?.notCheckedInCount ?? initialData.notCheckedInCount;
  const checkInPercentage = data?.checkInPercentage ?? initialData.checkInPercentage;
  const recentCheckIns = data?.recentCheckIns ?? initialData.recentCheckIns;

  // Show skeleton during initial load
  if (isLoading && !data) {
    return <CheckInMetricsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        role="region"
        aria-label="Check-in statistics"
      >
        {/* Total Tickets */}
        <Card className="bg-white dark:bg-gray-800">
          <div
            className="flex items-center justify-between"
            role="status"
            aria-label={`Total tickets: ${totalTickets}`}
          >
            <div className="min-w-0 flex-1">
              <p
                className="text-xs font-medium text-gray-600 sm:text-sm dark:text-gray-400"
                id="total-tickets-label"
              >
                Total Tickets
              </p>
              <p
                className="truncate text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white"
                aria-labelledby="total-tickets-label"
              >
                {totalTickets}
              </p>
            </div>
            <div className="shrink-0 rounded-full bg-blue-100 p-2 sm:p-3 dark:bg-blue-900">
              <HiTicket className="h-4 w-4 text-blue-600 sm:h-6 sm:w-6 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        {/* Checked In */}
        <Card className="bg-white dark:bg-gray-800">
          <div
            className="flex items-center justify-between"
            role="status"
            aria-label={`Checked in: ${checkedInCount}`}
            aria-live="polite"
          >
            <div className="min-w-0 flex-1">
              <p
                className="text-xs font-medium text-gray-600 sm:text-sm dark:text-gray-400"
                id="checked-in-label"
              >
                Checked In
              </p>
              <p
                className="truncate text-2xl font-bold text-green-600 sm:text-3xl dark:text-green-400"
                aria-labelledby="checked-in-label"
              >
                {checkedInCount}
              </p>
            </div>
            <div className="shrink-0 rounded-full bg-green-100 p-2 sm:p-3 dark:bg-green-900">
              <HiCheck className="h-4 w-4 text-green-600 sm:h-6 sm:w-6 dark:text-green-400" />
            </div>
          </div>
        </Card>

        {/* Not Checked In */}
        <Card className="bg-white dark:bg-gray-800">
          <div
            className="flex items-center justify-between"
            role="status"
            aria-label={`Not checked in: ${notCheckedInCount}`}
            aria-live="polite"
          >
            <div className="min-w-0 flex-1">
              <p
                className="text-xs font-medium text-gray-600 sm:text-sm dark:text-gray-400"
                id="not-checked-in-label"
              >
                Not Checked In
              </p>
              <p
                className="truncate text-2xl font-bold text-orange-600 sm:text-3xl dark:text-orange-400"
                aria-labelledby="not-checked-in-label"
              >
                {notCheckedInCount}
              </p>
            </div>
            <div className="shrink-0 rounded-full bg-orange-100 p-2 sm:p-3 dark:bg-orange-900">
              <HiClock className="h-4 w-4 text-orange-600 sm:h-6 sm:w-6 dark:text-orange-400" />
            </div>
          </div>
        </Card>

        {/* Check-In Rate */}
        <Card className="bg-white dark:bg-gray-800">
          <div
            className="flex items-center justify-between"
            role="status"
            aria-label={`Check-in rate: ${checkInPercentage.toFixed(1)} percent`}
            aria-live="polite"
          >
            <div className="min-w-0 flex-1">
              <p
                className="text-xs font-medium text-gray-600 sm:text-sm dark:text-gray-400"
                id="check-in-rate-label"
              >
                Check-In Rate
              </p>
              <p
                className="truncate text-2xl font-bold text-purple-600 sm:text-3xl dark:text-purple-400"
                aria-labelledby="check-in-rate-label"
              >
                {checkInPercentage.toFixed(1)}%
              </p>
            </div>
            <div className="shrink-0 rounded-full bg-purple-100 p-2 sm:p-3 dark:bg-purple-900">
              <HiTrendingUp className="h-4 w-4 text-purple-600 sm:h-6 sm:w-6 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="bg-white dark:bg-gray-800">
        <div className="space-y-2" role="region" aria-label="Check-in progress">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p
              className="text-xs font-medium text-gray-900 sm:text-sm dark:text-white"
              id="progress-label"
            >
              Check-In Progress
            </p>
            <p
              className="text-xs text-gray-600 sm:text-sm dark:text-gray-400"
              role="status"
              aria-live="polite"
            >
              {checkedInCount} of {totalTickets} checked in
            </p>
          </div>
          <Progress
            progress={checkInPercentage}
            size="lg"
            color={
              checkInPercentage >= 75
                ? "green"
                : checkInPercentage >= 50
                  ? "yellow"
                  : "red"
            }
            aria-labelledby="progress-label"
            aria-valuenow={checkInPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </Card>

      {/* Recent Check-Ins */}
      {recentCheckIns.length > 0 && (
        <Card className="bg-white dark:bg-gray-800">
          <div
            className="space-y-4"
            role="region"
            aria-label="Recent check-ins"
          >
            <h3
              className="text-base font-semibold text-gray-900 sm:text-lg dark:text-white"
              id="recent-checkins-heading"
            >
              Recent Check-Ins
            </h3>
            <div
              className="space-y-3"
              role="list"
              aria-labelledby="recent-checkins-heading"
            >
              {recentCheckIns.map((checkIn, index) => (
                <div
                  key={`${checkIn.ticketNumber}-${index}`}
                  className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700"
                  role="listitem"
                >
                  <div className="flex items-center gap-3">
                    <Badge color="success" icon={HiCheck} className="shrink-0">
                      Checked In
                    </Badge>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900 dark:text-white">
                        {checkIn.name}
                      </p>
                      <p className="truncate text-xs text-gray-600 sm:text-sm dark:text-gray-400">
                        {checkIn.ticketNumber}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-xs text-gray-500 sm:text-sm dark:text-gray-400">
                    {formatDateTime(checkIn.checkedInAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
