/**
 * Pending Invitations List Component
 *
 * Displays a list of pending team invitations with options to
 * resend or cancel. Shows invitation details and expiry information.
 *
 * @module components/team/pending-invitations-list
 */

"use client";

import { api } from "@/trpc/react";
import { Card, Badge, Button, Spinner } from "flowbite-react";
import { HiRefresh, HiMail, HiX, HiClock, HiExclamation } from "react-icons/hi";
import { formatDistanceToNow } from "date-fns";

interface PendingInvitationsListProps {
  eventId: string;
}

export function PendingInvitationsList({ eventId }: PendingInvitationsListProps) {
  // Fetch pending invitations
  const { data: invitations, isLoading, error, refetch } =
    api.team.getPendingInvitations.useQuery({
      eventId,
    });

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
      <div className="text-center py-8">
        <HiMail className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          No pending invitations
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          All invitations have been accepted, declined, or expired
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Invitation Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {invitations.length} pending {invitations.length === 1 ? "invitation" : "invitations"}
        </p>
        <Button color="gray" size="xs" onClick={() => void refetch()}>
          <HiRefresh className="mr-1 h-3 w-3" />
          Refresh
        </Button>
      </div>

      {/* Invitations List */}
      <div className="space-y-3">
        {invitations.map((invitation) => {
          const isExpiringSoon = new Date(invitation.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
          const isExpired = new Date(invitation.expiresAt) < new Date();

          return (
            <Card key={invitation.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {/* Invitation Info */}
                <div className="flex-1 min-w-0">
                  {/* Email */}
                  <div className="flex items-center gap-2 mb-2">
                    <HiMail className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {invitation.email}
                    </h4>
                  </div>

                  {/* Status and Expiry */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge color={isExpired ? "failure" : "warning"} size="xs" icon={HiClock}>
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
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
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
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      Sent {formatDistanceToNow(new Date(invitation.sentAt), { addSuffix: true })}
                    </span>
                    {invitation.sentBy && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span>by {invitation.sentBy.name ?? invitation.sentBy.email}</span>
                      </>
                    )}
                    <span className="hidden sm:inline">•</span>
                    <span className={isExpired ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                      {isExpired 
                        ? "Expired"
                        : `Expires ${formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}`
                      }
                    </span>
                  </div>
                </div>

                {/* Action Buttons - Placeholder for US2 tasks T041-T043 */}
                <div className="flex gap-2 self-end sm:self-start">
                  <Button
                    size="xs"
                    color="gray"
                    disabled
                    title="Resend invitation (Coming in T041-T043)"
                  >
                    <HiRefresh className="mr-1 h-3 w-3" />
                    Resend
                  </Button>
                  <Button
                    size="xs"
                    color="failure"
                    disabled
                    title="Cancel invitation (Coming in T041-T043)"
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
        <p className="font-medium mb-1">About Invitations:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Invitations expire after 7 days</li>
          <li>Recipients must accept within the expiry period</li>
          <li>Resend and Cancel actions coming in tasks T041-T043</li>
        </ul>
      </div>
    </div>
  );
}
