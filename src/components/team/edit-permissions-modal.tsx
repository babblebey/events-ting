/**
 * Edit Permissions Modal Component
 *
 * Modal dialog for updating a collaborator's module permissions.
 * Displays current permissions and allows organizers to modify them.
 * Includes optimistic updates and error handling.
 *
 * @module components/team/edit-permissions-modal
 */

"use client";

import { useState } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "flowbite-react";
import { ModulePermissionsSelector } from "./module-permissions-selector";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/toast-provider";
import { type ModuleName } from "@/lib/validators";

interface EditPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMember: {
    id: string;
    email: string;
    modulePermissions: string[];
    user: {
      name: string | null;
    } | null;
  };
  eventId: string;
}

export function EditPermissionsModal({
  isOpen,
  onClose,
  teamMember,
  eventId,
}: EditPermissionsModalProps) {
  const [selectedModules, setSelectedModules] = useState<ModuleName[]>(
    teamMember.modulePermissions as ModuleName[],
  );
  const [validationError, setValidationError] = useState<string>("");

  const toast = useToast();
  const utils = api.useUtils();

  const updatePermissions = api.team.updatePermissions.useMutation({
    onSuccess: () => {
      toast.success("Permissions updated successfully");
      // Invalidate queries to refresh data
      void utils.team.getMembers.invalidate({ eventId });
      onClose();
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to update permissions");
    },
  });

  const displayName = teamMember.user?.name ?? teamMember.email.split("@")[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate at least one module selected
    if (selectedModules.length === 0) {
      setValidationError("Select at least one module");
      return;
    }

    setValidationError("");

    // Check if permissions actually changed
    const currentSet = new Set(teamMember.modulePermissions);
    const newSet = new Set(selectedModules);
    const hasChanges =
      currentSet.size !== newSet.size ||
      [...currentSet].some((m) => !newSet.has(m as ModuleName));

    if (!hasChanges) {
      toast.info("No changes made to permissions");
      onClose();
      return;
    }

    // Update permissions
    updatePermissions.mutate({
      teamMemberId: teamMember.id,
      modulePermissions: selectedModules,
    });
  };

  const handleCancel = () => {
    // Reset to original permissions
    setSelectedModules(teamMember.modulePermissions as ModuleName[]);
    setValidationError("");
    onClose();
  };

  return (
    <Modal show={isOpen} onClose={handleCancel} size="2xl">
      <ModalHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Edit Permissions
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Update module access for {displayName}
            </p>
          </div>
        </div>
      </ModalHeader>

      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div className="space-y-4">
            {/* Collaborator Info */}
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Collaborator
              </p>
              <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                {displayName}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {teamMember.email}
              </p>
            </div>

            {/* Module Permissions Selector */}
            <div>
              <ModulePermissionsSelector
                selectedModules={selectedModules}
                onChange={setSelectedModules}
                disabled={updatePermissions.isPending}
                error={validationError}
              />
            </div>

            {/* Changes Summary */}
            {(() => {
              const currentSet = new Set(teamMember.modulePermissions);
              const newSet = new Set(selectedModules);
              const added = selectedModules.filter((m) => !currentSet.has(m as string));
              const removed = teamMember.modulePermissions.filter(
                (m) => !newSet.has(m as ModuleName),
              );

              if (added.length === 0 && removed.length === 0) return null;

              return (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                  <p className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-200">
                    Summary of Changes:
                  </p>
                  {added.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400">
                        ✓ Adding Access:
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {added.join(", ")}
                      </p>
                    </div>
                  )}
                  {removed.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-700 dark:text-red-400">
                        ✗ Removing Access:
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {removed.join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Warning about immediate effect */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ Changes take effect immediately. The collaborator will
                receive an email notification.
              </p>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <div className="flex w-full justify-end gap-3">
            <Button
              color="gray"
              onClick={handleCancel}
              disabled={updatePermissions.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              color="blue"
              disabled={updatePermissions.isPending}
            >
              {updatePermissions.isPending
                ? "Updating..."
                : "Update Permissions"}
            </Button>
          </div>
        </ModalFooter>
      </form>
    </Modal>
  );
}
