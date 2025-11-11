"use client";

/**
 * EventMetrics Component
 * Displays dashboard summary cards with key metrics for an event
 */

import { Card } from "flowbite-react";
import { HiOutlineUsers } from "react-icons/hi2";
import { PiMicrophoneStage } from "react-icons/pi";
import {
  HiOutlineTicket,
  HiOutlineMail,
  HiOutlineTrendingUp,
  HiOutlineCalendar,
} from "react-icons/hi";

interface Metric {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface EventMetricsProps {
  metrics: {
    totalRegistrations: number;
    totalTicketTypes: number;
    totalScheduleEntries: number;
    totalSpeakers: number;
    totalEmailCampaigns: number;
  };
  recentRegistrations?: Array<{
    id: string;
    name: string;
    email: string;
    registeredAt: Date;
    ticketType: {
      name: string;
    };
  }>;
}

export function EventMetrics({
  metrics,
  recentRegistrations,
}: EventMetricsProps) {
  const metricCards: Metric[] = [
    {
      label: "Total Attendees",
      value: metrics.totalRegistrations,
      icon: <HiOutlineUsers className="h-5 w-5" />,
      description: "Registered attendees",
    },
    {
      label: "Ticket Types",
      value: metrics.totalTicketTypes,
      icon: <HiOutlineTicket className="h-5 w-5" />,
      description: "Available ticket options",
    },
    {
      label: "Schedule Entries",
      value: metrics.totalScheduleEntries,
      icon: <HiOutlineCalendar className="h-5 w-5" />,
      description: "Sessions scheduled",
    },
    {
      label: "Speakers",
      value: metrics.totalSpeakers,
      icon: <PiMicrophoneStage className="h-5 w-5" />,
      description: "Confirmed speakers",
    },
    {
      label: "Email Campaigns",
      value: metrics.totalEmailCampaigns,
      icon: <HiOutlineMail className="h-5 w-5" />,
      description: "Sent or scheduled",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metricCards.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      {/* Recent Registrations */}
      {recentRegistrations && recentRegistrations.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Registrations
            </h3>
            <HiOutlineTrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {recentRegistrations.map((registration) => (
              <div
                key={registration.id}
                className="flex items-center justify-between border-b border-gray-200 pb-3 last:border-0 last:pb-0 dark:border-gray-700"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {registration.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {registration.email}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {registration.ticketType.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(registration.registeredAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {metric.label}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {metric.value}
          </p>
          {metric.description && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {metric.description}
            </p>
          )}
          {metric.trend && (
            <div
              className={`mt-2 flex items-center gap-1 text-sm ${
                metric.trend.isPositive
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              <HiOutlineTrendingUp
                className={`h-4 w-4 ${!metric.trend.isPositive && "rotate-180"}`}
              />
              <span>{Math.abs(metric.trend.value)}%</span>
            </div>
          )}
        </div>
        <div className="bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300 rounded-lg p-3">
          {metric.icon}
        </div>
      </div>
    </Card>
  );
}

export function EventMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-8 w-16 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="h-12 w-12 rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        </Card>
      ))}
    </div>
  );
}
