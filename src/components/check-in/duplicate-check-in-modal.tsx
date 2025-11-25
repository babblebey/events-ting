/**
 * Duplicate Check-In Warning Modal
 * Warns users when attempting to check in an already checked-in attendee
 */

"use client";

import { Modal, Button } from "flowbite-react";
import { HiExclamationCircle } from "react-icons/hi";

interface DuplicateCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  attendeeName: string;
  ticketNumber: string;
  checkedInAt?: Date | null;
  checkedInBy?: string | null;
}

export function DuplicateCheckInModal({
  isOpen,
  onClose,
  onConfirm,
  attendeeName,
  ticketNumber,
  checkedInAt,
  checkedInBy,
}: DuplicateCheckInModalProps) {
  const formatDateTime = (date: Date | null | undefined) => {
    if (!date) return "Unknown time";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  return (
    <Modal
      show={isOpen}
      onClose={onClose}
      size="md"
      dismissible
      role="alertdialog"
      aria-labelledby="duplicate-modal-title"
      aria-describedby="duplicate-modal-description"
    >
      <Modal.Header id="duplicate-modal-title">
        <div className="flex items-center gap-2">
          <HiExclamationCircle
            className="h-6 w-6 text-yellow-500"
            aria-hidden="true"
          />
          <span>Attendee Already Checked In</span>
        </div>
      </Modal.Header>
      <Modal.Body>
        <div className="space-y-4" id="duplicate-modal-description">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            This attendee has already been checked in. Do you want to proceed
            with checking them in again?
          </p>

          {/* Attendee Details */}
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="font-medium text-gray-700 dark:text-gray-300">
                  Name:
                </dt>
                <dd className="text-gray-900 dark:text-white">
                  {attendeeName}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-700 dark:text-gray-300">
                  Ticket:
                </dt>
                <dd className="font-mono text-gray-900 dark:text-white">
                  {ticketNumber}
                </dd>
              </div>
              {checkedInAt && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-700 dark:text-gray-300">
                    Previously Checked In:
                  </dt>
                  <dd className="text-gray-900 dark:text-white">
                    {formatDateTime(checkedInAt)}
                  </dd>
                </div>
              )}
              {checkedInBy && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-700 dark:text-gray-300">
                    Checked In By:
                  </dt>
                  <dd className="text-gray-900 dark:text-white">
                    {checkedInBy}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400">
            <strong>Note:</strong> Re-checking in an attendee will update their
            check-in timestamp to now. This action may be useful if the attendee
            temporarily left and returned.
          </p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            color="gray"
            onClick={onClose}
            className="w-full sm:w-auto"
            aria-label="Cancel duplicate check-in"
          >
            Cancel
          </Button>
          <Button
            color="warning"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full sm:w-auto"
            aria-label="Confirm duplicate check-in"
          >
            Yes, Check In Again
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
