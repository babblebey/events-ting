/**
 * Team Member Card Component
 *
 * Displays individual team member information including avatar,
 * name, role, status, and module permissions. Includes action buttons
 * for owners to manage member permissions.
 *
 * @module components/team/team-member-card
 */

"use client";

import { useState } from "react";
import { Card, Avatar, Badge, Button, Tooltip } from "flowbite-react";
import { RoleBadge } from "./role-badge";
import { StatusBadge } from "./status-badge";
import { EditPermissionsModal } from "./edit-permissions-modal";
import { RemoveMemberModal } from "./remove-member-modal";
import { HiPencil, HiTrash, HiMail } from "react-icons/hi";
import { formatDistanceToNow } from "date-fns";

interface TeamMemberCardProps {
  member: {
    id: string;
    email: string;
    role: "OWNER" | "COLLABORATOR";
    status: "PENDING" | "ACTIVE" | "REMOVED";
    modulePermissions: string[];
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    } | null;
    invitedBy: {
      id: string;
      name: string | null;
      email: string | null;
    };
    invitedAt: Date;
    lastAccessedAt: Date | null;
  };
  isOwner: boolean;
  eventId: string;
}

export function TeamMemberCard({
  member,
  isOwner,
  eventId,
}: TeamMemberCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);

  const displayName = member.user?.name ?? member.email.split("@")[0];
  const displayEmail = member.user?.email ?? member.email;
  const isUserActive = member.status === "ACTIVE" && member.user !== null;

  // Format last accessed date
  const lastAccessedText = member.lastAccessedAt
    ? `Last active ${formatDistanceToNow(new Date(member.lastAccessedAt), { addSuffix: true })}`
    : "Never accessed";

  // Format invited date
  const invitedText = `Invited ${formatDistanceToNow(new Date(member.invitedAt), { addSuffix: true })}`;

  return (
    <Card className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        {/* Avatar Section */}
        <div className="shrink-0">
          <Avatar
            img={member.user?.image ?? undefined}
            alt={displayName ?? "Team member"}
            size="lg"
            rounded
            placeholderInitials={displayName?.[0]?.toUpperCase() ?? "?"}
          />
        </div>

        {/* Member Info Section */}
        <div className="min-w-0 flex-1">
          {/* Name and Email */}
          <div className="mb-2">
            <h3 className="truncate text-base font-semibold text-gray-900 sm:text-lg dark:text-white">
              {displayName}
            </h3>
            {isUserActive && member.user?.name && (
              <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                {displayEmail}
              </p>
            )}
            {!isUserActive && (
              <div className="mt-1 flex items-center gap-2">
                <HiMail className="h-4 w-4 text-gray-400" />
                <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                  {displayEmail}
                </p>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="mb-3 flex flex-wrap gap-2">
            <RoleBadge role={member.role} />
            <StatusBadge status={member.status} />
          </div>

          {/* Module Permissions */}
          {member.role === "COLLABORATOR" &&
            member.modulePermissions.length > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Module Access:
                </p>
                <div className="flex flex-wrap gap-2">
                  {member.modulePermissions.map((module) => (
                    <Badge key={module} color="gray" size="xs">
                      {module}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

          {/* Owner has full access message */}
          {member.role === "OWNER" && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 italic dark:text-gray-400">
                Has full access to all modules
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center dark:text-gray-400">
            <span>{invitedText}</span>
            {member.invitedBy && (
              <>
                <span className="hidden sm:inline">•</span>
                <span>
                  by {member.invitedBy.name ?? member.invitedBy.email}
                </span>
              </>
            )}
            {member.status === "ACTIVE" && (
              <>
                <span className="hidden sm:inline">•</span>
                <span>{lastAccessedText}</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons - Owner Only */}
        {isOwner && member.role !== "OWNER" && member.status !== "REMOVED" && (
          <div className="flex w-full gap-2 sm:w-auto sm:flex-col sm:self-start">
            {member.status === "ACTIVE" && (
              <>
                <Tooltip content="Edit permissions">
                  <Button
                    size="sm"
                    color="gray"
                    aria-label="Edit permissions"
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex-1 sm:flex-none"
                  >
                    <HiPencil className="h-4 w-4" />
                  </Button>
                </Tooltip>
                <Tooltip content="Remove member">
                  <Button
                    size="sm"
                    color="failure"
                    aria-label="Remove member"
                    onClick={() => setIsRemoveModalOpen(true)}
                    className="flex-1 sm:flex-none"
                  >
                    <HiTrash className="h-4 w-4" />
                  </Button>
                </Tooltip>
              </>
            )}
          </div>
        )}

        {/* Pending State Notice */}
        {member.status === "PENDING" && (
          <div className="w-full sm:w-auto">
            <div className="text-xs text-gray-500 italic dark:text-gray-400">
              Awaiting invitation acceptance
            </div>
          </div>
        )}

        {/* Removed State Notice */}
        {member.status === "REMOVED" && (
          <div className="w-full sm:w-auto">
            <div className="text-xs text-gray-500 italic dark:text-gray-400">
              Access has been revoked
            </div>
          </div>
        )}
      </div>

      {/* Edit Permissions Modal */}
      {isOwner &&
        member.status === "ACTIVE" &&
        member.role === "COLLABORATOR" && (
          <EditPermissionsModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            teamMember={member}
            eventId={eventId}
          />
        )}

      {/* Remove Member Modal */}
      {isOwner &&
        member.status === "ACTIVE" &&
        member.role === "COLLABORATOR" && (
          <RemoveMemberModal
            isOpen={isRemoveModalOpen}
            onClose={() => setIsRemoveModalOpen(false)}
            teamMember={member}
            eventId={eventId}
          />
        )}
    </Card>
  );
}
