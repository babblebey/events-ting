/**
 * Invite Collaborator Modal Component
 *
 * Modal dialog for inviting new team collaborators to an event.
 * Wraps the InviteCollaboratorForm component in a modal interface.
 *
 * @module components/team/invite-collaborator-modal
 */

"use client";

import { Modal, ModalHeader, ModalBody } from "flowbite-react";
import { InviteCollaboratorForm } from "./invite-collaborator-form";

interface InviteCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
}

export function InviteCollaboratorModal({
  isOpen,
  onClose,
  eventId,
}: InviteCollaboratorModalProps) {
  return (
    <Modal show={isOpen} onClose={onClose} size="2xl" dismissible>
      <ModalHeader>Invite Team Collaborator</ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add team members to help manage your event. Assign specific modules
            they can access.
          </p>
          <InviteCollaboratorForm
            eventId={eventId}
            onSuccess={() => {
              onClose();
            }}
          />
        </div>
      </ModalBody>
    </Modal>
  );
}
