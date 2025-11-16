/**
 * Invite Collaborator Form Component
 *
 * Form for inviting new team collaborators to an event with specific module permissions.
 * Handles email validation, permission selection, and invitation submission.
 *
 * @module components/team/invite-collaborator-form
 */

"use client";

import { useState } from "react";
import { Button, Label, TextInput } from "flowbite-react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/toast-provider";
import { ModulePermissionsSelector } from "./module-permissions-selector";
import type { ModuleName } from "@/lib/validators";
import { HiOutlineMail, HiOutlinePaperAirplane } from "react-icons/hi";

interface InviteCollaboratorFormProps {
  eventId: string;
  onSuccess?: () => void;
}

export function InviteCollaboratorForm({
  eventId,
  onSuccess,
}: InviteCollaboratorFormProps) {
  const [email, setEmail] = useState("");
  const [modulePermissions, setModulePermissions] = useState<ModuleName[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<
    "general" | "existing_member" | "pending_invitation" | null
  >(null);
  const toast = useToast();
  const utils = api.useUtils();

  const inviteMutation = api.team.invite.useMutation({
    // Optimistic update: Add pending member to UI immediately
    onMutate: async (newInvite) => {
      // Cancel outgoing refetches
      await utils.team.getMembers.cancel({ eventId });
      await utils.team.getPendingInvitations.cancel({ eventId });

      // Snapshot previous values
      const previousMembers = utils.team.getMembers.getData({ eventId, status: undefined });
      const previousPendingMembers = utils.team.getMembers.getData({ eventId, status: "PENDING" });
      const previousInvitations = utils.team.getPendingInvitations.getData({ eventId });

      // Optimistically add the new pending member
      const optimisticMember = {
        id: `temp-${Date.now()}`,
        eventId,
        email: newInvite.email,
        role: "COLLABORATOR" as const,
        status: "PENDING" as const,
        modulePermissions: newInvite.modulePermissions,
        userId: null,
        user: null,
        invitedById: "",
        invitedBy: {
          id: "",
          name: "You",
          email: "",
        },
        invitedAt: new Date(),
        lastAccessedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Update all members list
      utils.team.getMembers.setData({ eventId, status: undefined }, (old) => {
        if (!old) return old;
        return {
          members: [optimisticMember, ...old.members],
          pagination: old.pagination,
        };
      });

      // Update pending members list
      utils.team.getMembers.setData({ eventId, status: "PENDING" }, (old) => {
        if (!old) return old;
        return {
          members: [optimisticMember, ...old.members],
          pagination: old.pagination,
        };
      });

      return { previousMembers, previousPendingMembers, previousInvitations };
    },
    onSuccess: (data) => {
      toast.success(
        "Invitation sent",
        `An invitation has been sent to ${data.invitation.email}`,
      );

      // Reset form
      setEmail("");
      setModulePermissions([]);
      setError(null);
      setErrorType(null);

      // Invalidate queries to refresh with real data
      void utils.team.getMembers.invalidate({ eventId });
      void utils.team.getPendingInvitations.invalidate({ eventId });

      onSuccess?.();
    },
    onError: (err: { message: string }, _variables, context) => {
      // Rollback optimistic update
      if (context?.previousMembers) {
        utils.team.getMembers.setData({ eventId, status: undefined }, context.previousMembers);
      }
      if (context?.previousPendingMembers) {
        utils.team.getMembers.setData({ eventId, status: "PENDING" }, context.previousPendingMembers);
      }
      if (context?.previousInvitations) {
        utils.team.getPendingInvitations.setData({ eventId }, context.previousInvitations);
      }

      setError(err.message);

      // Determine error type based on message content
      if (err.message.includes("already has an active membership")) {
        setErrorType("existing_member");
      } else if (err.message.includes("invitation has already been sent")) {
        setErrorType("pending_invitation");
      } else {
        setErrorType("general");
      }

      toast.error("Invitation failed", err.message);
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      void utils.team.getMembers.invalidate({ eventId });
      void utils.team.getPendingInvitations.invalidate({ eventId });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorType(null);

    // Client-side validation
    if (!email.trim()) {
      setError("Please enter an email address");
      setErrorType("general");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      setErrorType("general");
      return;
    }

    if (modulePermissions.length === 0) {
      setError("Please select at least one module");
      setErrorType("general");
      return;
    }

    // Submit invitation
    inviteMutation.mutate({
      eventId,
      email: email.trim().toLowerCase(),
      modulePermissions,
    });
  };

  const isLoading = inviteMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email Input */}
      <div>
        <div className="mb-2 block">
          <Label htmlFor="email">
            Email Address <span className="text-red-600">*</span>
          </Label>
        </div>
        <TextInput
          id="email"
          type="email"
          icon={HiOutlineMail}
          placeholder="collaborator@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          color={error?.includes("email") ? "failure" : undefined}
          disabled={isLoading}
          required
          autoComplete="email"
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          We&apos;ll send an invitation email to this address
        </p>
      </div>

      {/* Module Permissions Selector */}
      <div>
        <div className="mb-3 block">
          <Label>
            Module Permissions <span className="text-red-600">*</span>
          </Label>
        </div>
        <ModulePermissionsSelector
          selectedModules={modulePermissions}
          onChange={setModulePermissions}
          disabled={isLoading}
          error={
            error?.includes("module")
              ? "Please select at least one module"
              : undefined
          }
        />
      </div>

      {/* Error Messages with Actionable Suggestions */}
      {error && !error.includes("email") && !error.includes("module") && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            errorType === "existing_member" || errorType === "pending_invitation"
              ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
              : "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          <div className="flex items-start">
            <div className="shrink-0">
              {errorType === "existing_member" ||
              errorType === "pending_invitation" ? (
                <svg
                  className="h-5 w-5 text-amber-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className="font-medium">{error}</p>
              {errorType === "existing_member" && (
                <div className="mt-2 text-sm">
                  <p className="font-medium mb-1">What you can do instead:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      Go to the <strong>Team Members</strong> section below to
                      view their current permissions
                    </li>
                    <li>
                      Click <strong>Edit Permissions</strong> on their member
                      card to modify their module access
                    </li>
                    <li>
                      Or click <strong>Remove Access</strong> if you want to
                      revoke their membership first
                    </li>
                  </ul>
                </div>
              )}
              {errorType === "pending_invitation" && (
                <div className="mt-2 text-sm">
                  <p className="font-medium mb-1">What you can do instead:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      Go to the <strong>Pending Invitations</strong> section
                      below to view the existing invitation
                    </li>
                    <li>
                      Click <strong>Resend Invitation</strong> if they
                      didn&apos;t receive it
                    </li>
                    <li>
                      Or click <strong>Cancel</strong> to revoke the invitation
                      and send a new one with different permissions
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading} size="lg">
          {isLoading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Sending Invitation...
            </>
          ) : (
            <>
              <HiOutlinePaperAirplane className="mr-2 h-5 w-5" />
              Send Invitation
            </>
          )}
        </Button>
      </div>

      {/* Info Box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
        <p className="font-medium mb-1">What happens next?</p>
        <ul className="list-disc list-inside space-y-1">
          <li>The collaborator will receive an email invitation</li>
          <li>They&apos;ll have 7 days to accept the invitation</li>
          <li>Once accepted, they&apos;ll have access to the selected modules</li>
          <li>You can modify their permissions or remove access anytime</li>
        </ul>
      </div>
    </form>
  );
}
