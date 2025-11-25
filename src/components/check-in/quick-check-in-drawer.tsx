/**
 * Quick Check-In Drawer
 * Mobile-optimized slide-up drawer for displaying check-in results
 */

"use client";

import { Button, Spinner } from "flowbite-react";
import { HiCheckCircle, HiX } from "react-icons/hi";
import { formatInTimeZone } from "date-fns-tz";
import { useEffect, useState } from "react";

interface QuickCheckInDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckIn?: () => void;
  isProcessing?: boolean;
  
  // Ticket data
  ticketNumber: string;
  attendeeName: string | null;
  attendeeEmail: string | null;
  buyerName: string;
  buyerEmail: string;
  
  // Check-in status
  isCheckedIn: boolean;
  checkedInAt?: Date | null;
  eventTimezone: string;
}

export function QuickCheckInDrawer({
  isOpen,
  onClose,
  onCheckIn,
  isProcessing = false,
  ticketNumber,
  attendeeName,
  attendeeEmail,
  buyerName,
  buyerEmail,
  isCheckedIn,
  checkedInAt,
  eventTimezone,
}: QuickCheckInDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Small delay for smooth animation
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const displayName = attendeeName ?? buyerName;
  const displayEmail = attendeeEmail ?? buyerEmail;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-gray-900/50 transition-opacity duration-300 dark:bg-gray-900/80 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl transform rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-gray-800 ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3">
          <div className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <HiX className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="px-6 pb-6 pt-4">
          {/* Status Header */}
          <div className="mb-6 text-center">
            {isCheckedIn ? (
              <div className="inline-flex flex-col items-center gap-3">
                <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/30">
                  <HiCheckCircle className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Already Checked In
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    This attendee is all set
                  </p>
                </div>
              </div>
            ) : (
              <div className="inline-flex flex-col items-center gap-3">
                <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                  <HiCheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Ready to Check In
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Confirm attendee details below
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Attendee Details Card */}
          <div className="mb-6 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/50">
            {/* Ticket Number */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Ticket Number
              </p>
              <p className="mt-1.5 font-mono text-2xl font-bold text-gray-900 dark:text-white">
                {ticketNumber}
              </p>
            </div>

            {/* Attendee Name */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Attendee
              </p>
              <p className="mt-1.5 text-lg font-semibold text-gray-900 dark:text-white">
                {displayName}
              </p>
            </div>

            {/* Email */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Email
              </p>
              <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">
                {displayEmail}
              </p>
            </div>

            {/* Different buyer note */}
            {attendeeName && attendeeName !== buyerName && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                  Purchased by: {buyerName}
                </p>
              </div>
            )}

            {/* Check-in timestamp */}
            {isCheckedIn && checkedInAt && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Checked In At
                </p>
                <p className="mt-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formatInTimeZone(
                    checkedInAt,
                    eventTimezone,
                    "MMM d, yyyy 'at' h:mm a zzz",
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {isCheckedIn ? (
              <Button
                color="gray"
                onClick={onClose}
                className="flex-1"
                size="lg"
              >
                Close
              </Button>
            ) : (
              <>
                <Button
                  color="gray"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="flex-1"
                  size="lg"
                >
                  Cancel
                </Button>
                <Button
                  color="blue"
                  onClick={onCheckIn}
                  disabled={isProcessing}
                  className="flex-1"
                  size="lg"
                >
                  {isProcessing && <Spinner size="sm" className="mr-2" />}
                  {isProcessing ? "Checking In..." : "Check In"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
