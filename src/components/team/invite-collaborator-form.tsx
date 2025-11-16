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
  const toast = useToast();

  // Note: Utils commented out until User Story 2 procedures are implemented
  // const utils = api.useUtils();

  const inviteMutation = api.team.invite.useMutation({
    onSuccess: (data) => {
      toast.success(
        "Invitation sent",
        `An invitation has been sent to ${data.invitation.email}`,
      );

      // Reset form
      setEmail("");
      setModulePermissions([]);
      setError(null);

      // Invalidate queries to refresh team data (procedures will be added in User Story 2)
      // void utils.team.getMembers.invalidate({ eventId });
      // void utils.team.getPendingInvitations.invalidate({ eventId });

      onSuccess?.();
    },
    onError: (err: { message: string }) => {
      setError(err.message);
      toast.error("Invitation failed", err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (modulePermissions.length === 0) {
      setError("Please select at least one module");
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

      {/* General Error Message */}
      {error && !error.includes("email") && !error.includes("module") && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
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
