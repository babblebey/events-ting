/**
 * Team Management Page
 * Allows event organizers to view, invite, and manage team collaborators
 */

import { api } from "@/trpc/server";
import { Card } from "flowbite-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { InviteCollaboratorForm } from "@/components/team/invite-collaborator-form";
import { TeamMemberList } from "@/components/team/team-member-list";
import { PendingInvitationsList } from "@/components/team/pending-invitations-list";

interface TeamPageProps {
  params: { id: string };
}

export default async function TeamPage({ params }: TeamPageProps) {
  const event = await api.event.getById({ id: params.id });
  const currentMember = await api.team.getCurrentMember({
    eventId: params.id,
  }).catch(() => null);

  // Check if user is owner
  const isOwner = currentMember?.role === "OWNER";

  return (
    <div className="space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: event.name, href: `/${params.id}` },
          { label: "Settings", href: `/${params.id}/settings` },
          { label: "Team" },
        ]}
      />

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Team Management
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage team members and their module permissions
        </p>
      </div>

      {/* Invite New Collaborator Section - Owner Only */}
      {isOwner && (
        <Card>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Invite Collaborator
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Add team members to help manage your event. Assign specific
              modules they can access.
            </p>
          </div>
          <InviteCollaboratorForm eventId={params.id} />
        </Card>
      )}

      {/* Team Members List - Placeholder for T035-T040 (User Story 2) */}
      <Card>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Team Members
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View and manage all team members
          </p>
        </div>
        <TeamMemberList eventId={params.id} isOwner={isOwner} />
      </Card>

      {/* Pending Invitations List - T037 (User Story 2) */}
      {isOwner && (
        <Card>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Pending Invitations
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              View and manage outstanding invitations
            </p>
          </div>
          <PendingInvitationsList eventId={params.id} />
        </Card>
      )}

      {/* Non-Owner Access View */}
      {!isOwner && (
        <Card>
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Your Permissions
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              You have {currentMember?.role.toLowerCase()} access to this event
            </p>
            {currentMember?.modulePermissions && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Accessible Modules:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {currentMember.modulePermissions.map((module) => (
                    <span
                      key={module}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                    >
                      {module}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Only event owners can invite and manage team members.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
