/**
 * Pending Invitations List Component
 *
 * Displays a list of pending team invitations with options to
 * resend or cancel. Shows invitation details and expiry information.
 *
 * @module components/team/pending-invitations-list
 */

"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Card,
  Badge,
  Button,
  Spinner,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "flowbite-react";
import { HiRefresh, HiMail, HiX, HiClock, HiExclamation } from "react-icons/hi";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/components/ui/toast-provider";

interface PendingInvitationsListProps {
  eventId: string;
}

export function PendingInvitationsList({
  eventId,
}: PendingInvitationsListProps) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedInvitationId, setSelectedInvitationId] = useState<
    string | null
  >(null);
  const [selectedInvitationEmail, setSelectedInvitationEmail] = useState<
    string | null
  >(null);
  const toast = useToast();

  // Fetch pending invitations
  const {
    data: invitations,
    isLoading,
    error,
    refetch,
  } = api.team.getPendingInvitations.useQuery({
    eventId,
  });

  // Resend invitation mutation
  const resendInvitation = api.team.resendInvitation.useMutation({
    onSuccess: (data) => {
      toast.success(
        "Invitation resent",
        `A new invitation has been sent to ${data.invitation.email}`,
      );
      void refetch();
    },
    onError: (error) => {
      toast.error("Failed to resend invitation", error.message);
    },
  });

  // Cancel invitation mutation
  const cancelInvitation = api.team.cancelInvitation.useMutation({
    onSuccess: () => {
      toast.success(
        "Invitation cancelled",
        "The invitation has been cancelled successfully",
      );
      setCancelModalOpen(false);
      setSelectedInvitationId(null);
      setSelectedInvitationEmail(null);
      void refetch();
    },
    onError: (error) => {
      toast.error("Failed to cancel invitation", error.message);
    },
  });

  // Handle resend click
  const handleResend = (invitationId: string) => {
    resendInvitation.mutate({ invitationId });
  };

  // Handle cancel click
  const handleCancelClick = (invitationId: string, email: string) => {
    setSelectedInvitationId(invitationId);
    setSelectedInvitationEmail(email);
    setCancelModalOpen(true);
  };

  // Confirm cancel
  const handleConfirmCancel = () => {
    if (selectedInvitationId) {
      cancelInvitation.mutate({ invitationId: selectedInvitationId });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          Loading invitations...
        </span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-800 dark:text-red-400">
          Failed to load invitations: {error.message}
        </p>
        <Button
          color="failure"
          size="sm"
          className="mt-4"
          onClick={() => void refetch()}
        >
          <HiRefresh className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  // Empty state
  if (!invitations || invitations.length === 0) {
    return (
      <div className="py-8 text-center">
        <HiMail className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          No pending invitations
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
          All invitations have been accepted, declined, or expired
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Invitation Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {invitations.length} pending{" "}
            {invitations.length === 1 ? "invitation" : "invitations"}
          </p>
          <Button color="gray" size="xs" onClick={() => void refetch()}>
            <HiRefresh className="mr-1 h-3 w-3" />
            Refresh
          </Button>
        </div>

        {/* Invitations List */}
        <div className="space-y-3">
          {invitations.map((invitation) => {
            const isExpiringSoon =
              new Date(invitation.expiresAt).getTime() - Date.now() <
              24 * 60 * 60 * 1000;
            const isExpired = new Date(invitation.expiresAt) < new Date();

            return (
              <Card
                key={invitation.id}
                className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex flex-col items-start gap-4 sm:flex-row">
                  {/* Invitation Info */}
                  <div className="min-w-0 flex-1">
                    {/* Email */}
                    <div className="mb-2 flex items-center gap-2">
                      <HiMail className="h-5 w-5 shrink-0 text-gray-400" />
                      <h4 className="truncate text-base font-semibold text-gray-900 dark:text-white">
                        {invitation.email}
                      </h4>
                    </div>

                    {/* Status and Expiry */}
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Badge
                        color={isExpired ? "failure" : "warning"}
                        size="xs"
                        icon={HiClock}
                      >
                        {invitation.status}
                      </Badge>
                      {isExpired && (
                        <Badge color="failure" size="xs" icon={HiExclamation}>
                          Expired
                        </Badge>
                      )}
                      {isExpiringSoon && !isExpired && (
                        <Badge color="warning" size="xs" icon={HiExclamation}>
                          Expires Soon
                        </Badge>
                      )}
                    </div>

                    {/* Module Permissions */}
                    {invitation.modulePermissions.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Modules:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {invitation.modulePermissions.map((module) => (
                            <Badge key={module} color="gray" size="xs">
                              {module}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-col gap-1 text-xs text-gray-500 sm:flex-row sm:items-center sm:gap-2 dark:text-gray-400">
                      <span>
                        Sent{" "}
                        {formatDistanceToNow(new Date(invitation.sentAt), {
                          addSuffix: true,
                        })}
                      </span>
                      {invitation.sentBy && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span>
                            by{" "}
                            {invitation.sentBy.name ?? invitation.sentBy.email}
                          </span>
                        </>
                      )}
                      <span className="hidden sm:inline">•</span>
                      <span
                        className={
                          isExpired
                            ? "font-medium text-red-600 dark:text-red-400"
                            : ""
                        }
                      >
                        {isExpired
                          ? "Expired"
                          : `Expires ${formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}`}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 self-end sm:self-start">
                    <Button
                      size="xs"
                      color="gray"
                      disabled={resendInvitation.isPending}
                      onClick={() => handleResend(invitation.id)}
                    >
                      <HiRefresh className="mr-1 h-3 w-3" />
                      {resendInvitation.isPending ? "Sending..." : "Resend"}
                    </Button>
                    <Button
                      size="xs"
                      color="failure"
                      disabled={cancelInvitation.isPending}
                      onClick={() =>
                        handleCancelClick(invitation.id, invitation.email)
                      }
                    >
                      <HiX className="mr-1 h-3 w-3" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
          <p className="mb-1 font-medium">About Invitations:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Invitations expire after 7 days</li>
            <li>Recipients must accept within the expiry period</li>
            <li>Resend will generate a new link and reset the expiry date</li>
            <li>Cancel will permanently revoke the invitation</li>
          </ul>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal
        show={cancelModalOpen}
        size="md"
        onClose={() => setCancelModalOpen(false)}
      >
        <ModalHeader>Cancel Invitation</ModalHeader>
        <ModalBody>
          <div className="text-center">
            <HiExclamation className="mx-auto mb-4 h-14 w-14 text-gray-400 dark:text-gray-200" />
            <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
              Are you sure you want to cancel this invitation?
            </h3>
            {selectedInvitationEmail && (
              <p className="mb-5 text-sm text-gray-600 dark:text-gray-300">
                <span className="font-semibold">{selectedInvitationEmail}</span>{" "}
                will no longer be able to accept this invitation.
              </p>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <div className="flex w-full justify-center gap-4">
            <Button
              color="failure"
              onClick={handleConfirmCancel}
              disabled={cancelInvitation.isPending}
            >
              {cancelInvitation.isPending
                ? "Cancelling..."
                : "Yes, cancel invitation"}
            </Button>
            <Button
              color="gray"
              onClick={() => setCancelModalOpen(false)}
              disabled={cancelInvitation.isPending}
            >
              No, keep it
            </Button>
          </div>
        </ModalFooter>
      </Modal>
    </>
  );
}
