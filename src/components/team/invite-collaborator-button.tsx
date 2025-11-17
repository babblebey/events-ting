/**
 * Invite Collaborator Button Component
 *
 * Client component that provides a button to open the invite collaborator modal.
 * Manages modal state and user interaction.
 *
 * @module components/team/invite-collaborator-button
 */

"use client";

import { useState } from "react";
import { Button } from "flowbite-react";
import { HiOutlineUserAdd } from "react-icons/hi";
import { InviteCollaboratorModal } from "./invite-collaborator-modal";

interface InviteCollaboratorButtonProps {
  eventId: string;
}

export function InviteCollaboratorButton({
  eventId,
}: InviteCollaboratorButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        size="lg"
        className="w-full sm:w-auto"
      >
        <HiOutlineUserAdd className="mr-2 h-5 w-5" />
        Invite Collaborator
      </Button>

      <InviteCollaboratorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eventId={eventId}
      />
    </>
  );
}
