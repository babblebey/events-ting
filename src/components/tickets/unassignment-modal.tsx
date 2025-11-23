"use client";

/**
 * Ticket Unassignment Modal Component
 * Allows buyers to unassign tickets from attendees with confirmation
 */

import { useState, useEffect } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  Button,
  Alert,
  Spinner,
} from "flowbite-react";
import {
  HiExclamationCircle,
  HiUserCircle,
  HiTicket,
} from "react-icons/hi";
import { api } from "@/trpc/react";

interface UnassignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: {
    id: string;
    ticketNumber: string;
    attendee: {
      id: string;
      name: string;
      email: string;
    };
    updatedAt: Date;
  };
  eventName: string;
  onSuccess?: () => void;
}

export function UnassignmentModal({
  isOpen,
  onClose,
  ticket,
  eventName,
  onSuccess,
}: UnassignmentModalProps) {
  const [confirmed, setConfirmed] = useState(false);

  const utils = api.useUtils();

  // Reset confirmation when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmed(false);
    }
  }, [isOpen]);

  const unassignMutation = api.tickets.unassign.useMutation({
    onSuccess: () => {
      void utils.registration.getById.invalidate();
      void utils.registration.getByIdPublic.invalidate();
      void utils.tickets.list.invalidate();
      onSuccess?.();
      onClose();
    },
  });

  const handleUnassign = () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    unassignMutation.mutate({
      ticketId: ticket.id,
      expectedUpdatedAt: ticket.updatedAt,
    });
  };

  const handleCancel = () => {
    if (confirmed) {
      setConfirmed(false);
    } else {
      onClose();
    }
  };

  return (
    <Modal show={isOpen} onClose={onClose} size="lg" dismissible>
      <ModalHeader>Unassign Ticket</ModalHeader>

      <ModalBody>
        {/* Warning Alert */}
        <Alert
          color={confirmed ? "failure" : "warning"}
          icon={HiExclamationCircle}
          className="mb-4"
        >
          <div>
            <span className="font-medium">
              {confirmed ? "Final Confirmation Required" : "Warning: Permanent Action"}
            </span>
            <p className="mt-2 text-sm">
              {confirmed
                ? "This action cannot be undone. The attendee's information will be permanently deleted for privacy compliance (GDPR)."
                : "Unassigning this ticket will permanently delete the attendee's information from our system."}
            </p>
          </div>
        </Alert>

        {/* Ticket & Event Info */}
        <div className="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <div className="mb-3 flex items-center gap-2 text-sm">
            <HiTicket className="h-5 w-5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {eventName}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Ticket: {ticket.ticketNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Current Attendee Info */}
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 flex items-center gap-2">
            <HiUserCircle className="h-5 w-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Current Attendee
            </h3>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Name:</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {ticket.attendee.name}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Email:</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {ticket.attendee.email}
              </dd>
            </div>
          </dl>
        </div>

        {/* Privacy Notice */}
        {!confirmed && (
          <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <h4 className="mb-2 font-semibold text-red-800 dark:text-red-300">
              What happens when you unassign:
            </h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-red-700 dark:text-red-400">
              <li>The attendee's name and email will be permanently deleted</li>
              <li>Any custom field data will be removed</li>
              <li>The ticket will be available for reassignment</li>
              <li>This action cannot be undone</li>
            </ul>
          </div>
        )}

        {/* Confirmation Step */}
        {confirmed && (
          <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <p className="mb-2 font-semibold text-red-800 dark:text-red-300">
              ⚠️ Please confirm you understand:
            </p>
            <p className="text-sm text-red-700 dark:text-red-400">
              By clicking "Permanently Unassign", you acknowledge that{" "}
              <strong>{ticket.attendee.name}'s</strong> information will be
              permanently deleted from the system and cannot be recovered.
            </p>
          </div>
        )}

        {/* Error Display */}
        {unassignMutation.error && (
          <Alert color="failure" icon={HiExclamationCircle} className="mt-4">
            <span className="font-medium">Unassignment failed:</span>{" "}
            {unassignMutation.error.message}
          </Alert>
        )}
      </ModalBody>

      <div className="flex justify-end gap-3 border-t border-gray-200 p-6 dark:border-gray-700">
        <Button
          color="gray"
          onClick={handleCancel}
          disabled={unassignMutation.isPending}
        >
          {confirmed ? "Back" : "Cancel"}
        </Button>
        <Button
          color="red"
          onClick={handleUnassign}
          disabled={unassignMutation.isPending}
        >
          {unassignMutation.isPending ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Unassigning...
            </>
          ) : confirmed ? (
            "Permanently Unassign"
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </Modal>
  );
}
