/**
 * Permission Explainer Modal Component
 *
 * Modal dialog that displays detailed information about module permissions.
 * Provides a comprehensive guide for understanding what each module allows.
 *
 * @module components/team/permission-explainer-modal
 */

"use client";

import { Modal, ModalHeader, ModalBody, Button } from "flowbite-react";
import { PermissionExplainer } from "./permission-explainer";

interface PermissionExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PermissionExplainerModal({
  isOpen,
  onClose,
}: PermissionExplainerModalProps) {
  return (
    <Modal
      show={isOpen}
      onClose={onClose}
      size="4xl"
      aria-labelledby="permission-explainer-title"
    >
      <ModalHeader>
        <span id="permission-explainer-title">Module Permissions Guide</span>
      </ModalHeader>
      <ModalBody>
        <PermissionExplainer />
      </ModalBody>
    </Modal>
  );
}
