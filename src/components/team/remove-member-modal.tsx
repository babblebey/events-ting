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
    onSuccess: () => {
      toast.success("Team member removed successfully");
      // Invalidate queries to refresh the team member list
      void utils.team.getMembers.invalidate({ eventId });
      onClose();
    },
    onError: (error) => {
      toast.error(
        "Removal Failed",
        error.message ?? "Failed to remove team member",
      );
    },
    onSettled: () => {
      setIsRemoving(false);
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
    <Modal show={isOpen} onClose={onClose} size="md">
      <ModalHeader>
        <div className="flex items-center gap-2">
          <HiTrash className="h-5 w-5 text-red-600 dark:text-red-500" />
          <span>Remove Team Member</span>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-4">
          <Alert color="warning" icon={HiExclamationCircle}>
            <span className="font-medium">Warning:</span> This action will
            immediately revoke all access for this team member.
          </Alert>

          <div className="text-sm text-gray-700 dark:text-gray-300">
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
        <div className="flex w-full justify-end gap-2">
          <Button color="gray" onClick={onClose} disabled={isRemoving}>
            Cancel
          </Button>
          <Button color="failure" onClick={handleRemove} disabled={isRemoving}>
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
