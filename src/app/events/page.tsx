/**
 * Events Listing Page (Public)
 * Shows all published events in a grid layout with pagination
 */

import Link from "next/link";
import { Button } from "flowbite-react";
import { HiOutlinePlusCircle } from "react-icons/hi";
import { EventsListClient } from "./events-list-client";

export const metadata = {
  title: "Events | Events Ting",
  description: "Browse and discover upcoming events",
};

export default function EventsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Discover Events
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Browse upcoming conferences, meetups, and workshops
          </p>
        </div>
        <Link href="/create-event">
          <Button>
            <HiOutlinePlusCircle className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        </Link>
      </div>

      <EventsListClient />
    </div>
  );
}

function EventsListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="h-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"
        />
      ))}
    </div>
  );
}
