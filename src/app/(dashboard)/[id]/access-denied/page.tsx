/**
 * Access Denied Page
 * Shown when a user attempts to access an event they don't have permission for
 */

import Link from "next/link";
import { HiExclamationCircle, HiHome } from "react-icons/hi";
import { Button } from "flowbite-react";

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-6 dark:bg-red-900/20">
            <HiExclamationCircle className="h-16 w-16 text-red-600 dark:text-red-500" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Access Denied
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            You don&apos;t have permission to access this event
          </p>
        </div>

        {/* Explanation */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h2 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
            Possible reasons:
          </h2>
          <ul className="space-y-2 text-left text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>
                You are not a member of this event&apos;s team
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>
                Your invitation is still pending acceptance
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>
                Your access to this event has been removed
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>
                The event organizer has restricted access
              </span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/dashboard">
            <Button color="blue" className="w-full sm:w-auto">
              <HiHome className="mr-2 h-5 w-5" />
              Go to Dashboard
            </Button>
          </Link>
        </div>

        {/* Help Text */}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          If you believe this is an error, please contact the event organizer.
        </p>
      </div>
    </div>
  );
}
