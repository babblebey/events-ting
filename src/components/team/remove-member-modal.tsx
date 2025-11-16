/**
 * Remove Member Modal Component
 *
 * Confirmation dialog for removing a team member's access.
 * Includes warnings about permanent access revocation.
 *
 * @module components/team/remove-member-modal
 */

"use client";

import { useState } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
} from "flowbite-react";
import { HiExclamationCircle, HiTrash } from "react-icons/hi";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/toast-provider";

interface RemoveMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMember: {
    id: string;
    email: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
    } | null;
  };
  eventId: string;
}

export function RemoveMemberModal({
  isOpen,
  onClose,
  teamMember,
  eventId,
}: RemoveMemberModalProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const toast = useToast();
  const utils = api.useUtils();
  const removeMemberMutation = api.team.removeMember.useMutation({
    // Optimistic update: Remove member from UI immediately
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await utils.team.getMembers.cancel({ eventId });

      // Snapshot previous values
      const previousMembers = utils.team.getMembers.getData({
        eventId,
        status: undefined,
      });
      const previousActiveMembers = utils.team.getMembers.getData({
        eventId,
        status: "ACTIVE",
      });

      // Optimistically update member status to REMOVED
      const updateMemberStatus = (old: typeof previousMembers) => {
        if (!old) return old;
        return {
          ...old,
          members: old.members.map((member) =>
            member.id === variables.teamMemberId
              ? { ...member, status: "REMOVED" as const }
              : member,
          ),
        };
      };

      utils.team.getMembers.setData(
        { eventId, status: undefined },
        updateMemberStatus,
      );
      utils.team.getMembers.setData({ eventId, status: "ACTIVE" }, (old) => {
        if (!old) return old;
        return {
          ...old,
          members: old.members.filter(
            (member) => member.id !== variables.teamMemberId,
          ),
        };
      });

      return { previousMembers, previousActiveMembers };
    },
    onSuccess: () => {
      toast.success("Team member removed successfully");
      // Invalidate queries to refresh with real data
      void utils.team.getMembers.invalidate({ eventId });
      onClose();
    },
    onError: (error, _variables, context) => {
      // Rollback optimistic update
      if (context?.previousMembers) {
        utils.team.getMembers.setData(
          { eventId, status: undefined },
          context.previousMembers,
        );
      }
      if (context?.previousActiveMembers) {
        utils.team.getMembers.setData(
          { eventId, status: "ACTIVE" },
          context.previousActiveMembers,
        );
      }

      toast.error(
        "Removal Failed",
        error.message ?? "Failed to remove team member",
      );
    },
    onSettled: () => {
      setIsRemoving(false);
      // Always refetch to ensure consistency
      void utils.team.getMembers.invalidate({ eventId });
    },
  });

  const handleRemove = async () => {
    setIsRemoving(true);
    removeMemberMutation.mutate({
      teamMemberId: teamMember.id,
    });
  };

  const displayName =
    teamMember.user?.name ?? teamMember.email.split("@")[0] ?? "this member";

  return (
    <Modal
      show={isOpen}
      onClose={onClose}
      size="md"
      aria-labelledby="remove-member-title"
      aria-describedby="remove-member-warning"
    >
      <ModalHeader>
        <div className="flex items-center gap-2">
          <HiTrash
            className="h-5 w-5 text-red-600 dark:text-red-500"
            aria-hidden="true"
          />
          <span id="remove-member-title">Remove Team Member</span>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-4">
          <Alert
            color="warning"
            icon={HiExclamationCircle}
            role="alert"
            aria-live="assertive"
          >
            <span className="font-medium">Warning:</span> This action will
            immediately revoke all access for this team member.
          </Alert>

          <div
            id="remove-member-warning"
            className="text-sm text-gray-700 dark:text-gray-300"
          >
            <p className="mb-2">
              Are you sure you want to remove <strong>{displayName}</strong>{" "}
              from this event?
            </p>
            <ul className="list-inside list-disc space-y-1 text-gray-600 dark:text-gray-400">
              <li>They will no longer be able to access any event modules</li>
              <li>Any active sessions will be terminated</li>
              <li>They will receive an email notification</li>
              <li>You can re-invite them later if needed</li>
            </ul>
          </div>

          {teamMember.user?.email && (
            <div className="rounded bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <strong>Email:</strong> {teamMember.user.email}
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="flex w-full flex-col-reverse justify-end gap-3 sm:flex-row">
          <Button
            color="gray"
            onClick={onClose}
            disabled={isRemoving}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            color="failure"
            onClick={handleRemove}
            disabled={isRemoving}
            className="w-full sm:w-auto"
          >
            {isRemoving ? (
              <>
                <HiTrash className="mr-2 h-4 w-4 animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <HiTrash className="mr-2 h-4 w-4" />
                Remove Member
              </>
            )}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
