/**
 * Reusable skeleton components for loading states
 * Uses custom Skeleton component for consistent loading UI
 */

import { Card } from "flowbite-react";
import React from "react";

/**
 * Base Skeleton component
 */
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-300 dark:bg-gray-700 ${className}`}
    />
  );
}

/**
 * Skeleton for metric cards (used in dashboard overview)
 */
export function MetricCardSkeleton() {
  return (
    <Card>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
    </Card>
  );
}

/**
 * Skeleton for table rows
 */
export function TableRowSkeleton() {
  return (
    <tr className="border-b bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-600">
      <td className="px-6 py-4">
        <Skeleton className="h-4 w-full" />
      </td>
      <td className="px-6 py-4">
        <Skeleton className="h-4 w-full" />
      </td>
      <td className="px-6 py-4">
        <Skeleton className="h-4 w-full" />
      </td>
      <td className="px-6 py-4">
        <Skeleton className="h-8 w-20" />
      </td>
    </tr>
  );
}

/**
 * Skeleton for full table with header
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
      <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
        <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th scope="col" className="px-6 py-3">
              <Skeleton className="h-4 w-24" />
            </th>
            <th scope="col" className="px-6 py-3">
              <Skeleton className="h-4 w-24" />
            </th>
            <th scope="col" className="px-6 py-3">
              <Skeleton className="h-4 w-24" />
            </th>
            <th scope="col" className="px-6 py-3">
              <Skeleton className="h-4 w-24" />
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <TableRowSkeleton key={index} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Skeleton for card list items
 */
export function CardListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: items }).map((_, index) => (
        <Card key={index}>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton for form inputs
 */
export function FormSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

/**
 * Skeleton for schedule timeline view
 */
export function ScheduleTimelineSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex gap-4">
          <div className="w-24 shrink-0">
            <Skeleton className="h-4 w-20" />
          </div>
          <Card className="flex-1">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for speaker grid
 */
export function SpeakerGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="mt-2 flex gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton for page header with title and action button
 */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <Skeleton className="mb-2 h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

/**
 * Skeleton for stats/metrics row
 */
export function MetricsRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <MetricCardSkeleton key={index} />
      ))}
    </div>
  );
}
