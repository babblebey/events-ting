"use client";

/**
 * CheckInMetrics Component
 * Displays check-in statistics and recent activity
 * Server Component for optimal performance
 */

import { Card, Progress, Badge } from "flowbite-react";
import { HiTicket, HiCheck, HiClock, HiTrendingUp } from "react-icons/hi";

// Type definitions from contracts
type RecentCheckIn = {
  ticketNumber: string;
  name: string;
  checkedInAt: Date;
};

interface CheckInMetricsProps {
  totalTickets: number;
  checkedInCount: number;
  notCheckedInCount: number;
  checkInPercentage: number;
  recentCheckIns: RecentCheckIn[];
}

export function CheckInMetrics({
  totalTickets,
  checkedInCount,
  notCheckedInCount,
  checkInPercentage,
  recentCheckIns,
}: CheckInMetricsProps) {
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Total Tickets */}
        <Card className="bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Tickets
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {totalTickets}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
              <HiTicket className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        {/* Checked In */}
        <Card className="bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Checked In
              </p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {checkedInCount}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
              <HiCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        {/* Not Checked In */}
        <Card className="bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Not Checked In
              </p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {notCheckedInCount}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900">
              <HiClock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>

        {/* Check-In Rate */}
        <Card className="bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Check-In Rate
              </p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {checkInPercentage.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900">
              <HiTrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="bg-white dark:bg-gray-800">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Check-In Progress
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
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
          />
        </div>
      </Card>

      {/* Recent Check-Ins */}
      {recentCheckIns.length > 0 && (
        <Card className="bg-white dark:bg-gray-800">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Check-Ins
            </h3>
            <div className="space-y-3">
              {recentCheckIns.map((checkIn, index) => (
                <div
                  key={`${checkIn.ticketNumber}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <Badge color="success" icon={HiCheck}>
                      Checked In
                    </Badge>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {checkIn.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {checkIn.ticketNumber}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
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
