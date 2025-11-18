/**
 * Permission Explainer Trigger Component
 *
 * Client component that provides a button to open the permission explainer modal.
 * Manages modal state and user interaction.
 *
 * @module components/team/permission-explainer-trigger
 */

"use client";

import { useState } from "react";
import { Button } from "flowbite-react";
import { HiInformationCircle } from "react-icons/hi";
import { PermissionExplainerModal } from "./permission-explainer-modal";

export function PermissionExplainerTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        color="light"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2"
      >
        <HiInformationCircle className="h-4 w-4" />
        Learn about module permissions
      </Button>

      <PermissionExplainerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
