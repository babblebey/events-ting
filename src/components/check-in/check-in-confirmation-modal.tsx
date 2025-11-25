/**
 * Check-In Confirmation Modal
 *
 * Displays attendee details and asks for confirmation before completing check-in.
 * Used after successful QR code scan to prevent accidental check-ins.
 *
 * Features:
 * - Shows ticket number, attendee/buyer name, and email
 * - Confirm or cancel check-in action
 * - Loading state during check-in processing
 *
 * @module components/check-in/check-in-confirmation-modal
 */

"use client";

import { Modal, Button } from "flowbite-react";
import { HiCheckCircle, HiX } from "react-icons/hi";

interface CheckInConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
  ticketNumber: string;
  attendeeName?: string | null;
  attendeeEmail?: string | null;
  buyerName?: string;
  buyerEmail?: string;
}

/**
 * Check-In Confirmation Modal Component
 *
 * @example
 * ```tsx
 * <CheckInConfirmationModal
 *   isOpen={!!pendingCheckIn}
 *   onClose={() => setPendingCheckIn(null)}
 *   onConfirm={handleConfirmCheckIn}
 *   isProcessing={isCheckingIn}
 *   ticketNumber="TKT-12345"
 *   attendeeName="John Doe"
 *   attendeeEmail="john@example.com"
 *   buyerName="Jane Doe"
 *   buyerEmail="jane@example.com"
 * />
 * ```
 */
export function CheckInConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
  ticketNumber,
  attendeeName,
  attendeeEmail,
  buyerName,
  buyerEmail,
}: CheckInConfirmationModalProps) {
  // Determine display name and email (prefer attendee, fallback to buyer)
  const displayName = attendeeName ?? buyerName;
  const displayEmail = attendeeEmail ?? buyerEmail;
  const hasAssignedAttendee = !!attendeeName;

  return (
    <Modal
      show={isOpen}
      onClose={onClose}
      size="md"
      dismissible={!isProcessing}
      role="dialog"
      aria-labelledby="checkin-confirmation-title"
    >
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <HiCheckCircle
            className="h-6 w-6 text-green-600 dark:text-green-400"
            aria-hidden="true"
          />
          <h3
            id="checkin-confirmation-title"
            className="text-xl font-semibold text-gray-900 dark:text-white"
          >
            Confirm Check-In
          </h3>
        </div>

        {/* Body */}
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please verify the attendee details before checking them in.
          </p>

          {/* Ticket Details Card */}
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            {/* Ticket Number */}
            <div>
              <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Ticket Number
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-gray-900 dark:text-white">
                {ticketNumber}
              </p>
            </div>

            {/* Name */}
            <div>
              <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                {hasAssignedAttendee ? "Attendee Name" : "Buyer Name"}
              </p>
              <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                {displayName}
              </p>
            </div>

            {/* Email */}
            {displayEmail && (
              <div>
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Email
                </p>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  {displayEmail}
                </p>
              </div>
            )}

            {/* Show buyer info if ticket is assigned to different attendee */}
            {hasAssignedAttendee && buyerName && buyerName !== attendeeName && (
              <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Purchased By
                </p>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  {buyerName}
                  {buyerEmail && buyerEmail !== attendeeEmail && (
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {buyerEmail}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Confirmation Message */}
          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              <HiCheckCircle className="mr-1 inline h-4 w-4" />
              This action will mark the attendee as checked in.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            color="gray"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Cancel check-in"
            className="w-full sm:w-auto"
          >
            <HiX className="mr-2 h-4 w-4" aria-hidden="true" />
            Cancel
          </Button>
          <Button
            color="green"
            onClick={onConfirm}
            disabled={isProcessing}
            aria-label="Confirm check-in"
            className="w-full sm:w-auto"
          >
            {isProcessing ? (
              <>
                <svg
                  aria-hidden="true"
                  className="mr-2 h-4 w-4 animate-spin fill-white text-gray-200 dark:text-gray-600"
                  viewBox="0 0 100 101"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="currentColor"
                  />
                  <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="currentFill"
                  />
                </svg>
                Checking In...
              </>
            ) : (
              <>
                <HiCheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                Confirm Check-In
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
