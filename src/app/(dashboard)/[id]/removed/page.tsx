/**
 * Removed Access Notification Page
 *
 * Displays when a team member's access has been revoked.
 * Provides clear messaging and next steps for the user.
 *
 * @module app/(dashboard)/[id]/removed
 */

import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { Alert, Button, Card } from "flowbite-react";
import { HiExclamationCircle, HiHome } from "react-icons/hi";
import Link from "next/link";

interface RemovedPageProps {
  params: {
    id: string;
  };
}

export default async function RemovedPage({ params }: RemovedPageProps) {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Fetch event details
  const event = await db.event.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  // If event doesn't exist, redirect to dashboard
  if (!event) {
    redirect("/dashboard");
  }

  // Check if user has REMOVED status
  const teamMember = await db.teamMember.findFirst({
    where: {
      eventId: params.id,
      userId: session.user.id,
    },
    select: {
      id: true,
      status: true,
      role: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  // If user has ACTIVE status, redirect to event
  if (teamMember?.status === "ACTIVE") {
    redirect(`/${params.id}`);
  }

  // If user has no team member record, redirect to dashboard
  if (!teamMember || teamMember.status === "PENDING") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="w-full max-w-2xl">
        <Card>
          <div className="space-y-6 text-center">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 p-6 dark:bg-red-900">
                <HiExclamationCircle className="h-16 w-16 text-red-600 dark:text-red-400" />
              </div>
            </div>

            {/* Heading */}
            <div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
                Access Removed
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Your access to <strong>{event.name}</strong> has been revoked
              </p>
            </div>

            {/* Alert */}
            <Alert color="failure" icon={HiExclamationCircle}>
              <span className="font-medium">Access Denied</span>
              <div className="mt-2 text-sm">
                You no longer have permission to view or manage this event. The
                event organizer has removed your access.
              </div>
            </Alert>

            {/* Information */}
            <div className="space-y-4 rounded-lg bg-gray-50 p-6 text-left dark:bg-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                What happened?
              </h2>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    The event organizer has revoked your team member access
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    You can no longer view or manage any modules for this event
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    Your previous contributions and work remain part of the
                    event
                  </span>
                </li>
              </ul>

              <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                  What can you do?
                </h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      If you believe this was done in error, contact the event
                      organizer directly
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      The organizer can re-invite you if they wish to restore
                      your access
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col justify-center gap-3 pt-4 sm:flex-row">
              <Link href="/dashboard">
                <Button color="gray" size="lg">
                  <HiHome className="mr-2 h-5 w-5" />
                  Go to Dashboard
                </Button>
              </Link>
            </div>

            {/* Metadata */}
            <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Access removed on{" "}
                {new Date(teamMember.updatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
