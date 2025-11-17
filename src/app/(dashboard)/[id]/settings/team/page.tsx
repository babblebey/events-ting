/**
 * Team Management Page
 * Allows event organizers to view, invite, and manage team collaborators
 */

import { api } from "@/trpc/server";
import { Card } from "flowbite-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { InviteCollaboratorButton } from "@/components/team/invite-collaborator-button";
import { TeamMemberList } from "@/components/team/team-member-list";
import { PendingInvitationsList } from "@/components/team/pending-invitations-list";
import { RoleBadge } from "@/components/team/role-badge";
import { HiInformationCircle, HiCheckCircle } from "react-icons/hi";

interface TeamPageProps {
  params: { id: string };
}

export default async function TeamPage({ params }: TeamPageProps) {
  const event = await api.event.getById({ id: params.id });
  const currentMember = await api.team
    .getCurrentMember({
      eventId: params.id,
    })
    .catch(() => null);

  // Check if user is owner
  const isOwner = currentMember?.role === "OWNER";

  // Module display names
  const MODULE_DISPLAY: Record<string, { label: string; description: string }> =
    {
      OVERVIEW: {
        label: "Overview",
        description: "Dashboard and event overview access",
      },
      ATTENDEES: {
        label: "Attendees",
        description: "Manage event attendees and registrations",
      },
      TICKETS: {
        label: "Tickets",
        description: "Manage ticket types and sales",
      },
      SCHEDULE: {
        label: "Schedule",
        description: "Manage event schedule and sessions",
      },
      SPEAKERS: {
        label: "Speakers",
        description: "Manage event speakers and profiles",
      },
      CFP: {
        label: "Call for Papers",
        description: "Manage CFP submissions and reviews",
      },
      COMMUNICATIONS: {
        label: "Communications",
        description: "Manage event communications and emails",
      },
    };

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Team Management
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage team members and their module permissions
          </p>
        </div>
        {/* Invite Collaborator Button - Owner Only */}
        {isOwner && <InviteCollaboratorButton eventId={params.id} />}
      </div>

      {/* Your Permissions Section - Shown to All Users */}
      {currentMember && (
        <Card>
          <div className="mb-6 flex items-start gap-3">
            <HiInformationCircle className="mt-1 h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Your Access Level
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Your current role and module permissions for this event
              </p>
            </div>
            <RoleBadge role={currentMember.role} />
          </div>

          <div className="space-y-6">
            {/* Role Explanation */}
            {currentMember.role === "OWNER" ? (
              <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                <div className="flex items-start gap-3">
                  <HiCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-700 dark:text-green-400" />
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      Event Owner - Full Access
                    </p>
                    <p className="mt-1 text-sm text-green-800 dark:text-green-200">
                      As the event owner, you have unrestricted access to all
                      modules and can manage team members, invite collaborators,
                      and configure event settings.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <div className="flex items-start gap-3">
                  <HiCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                      Collaborator - Limited Access
                    </p>
                    <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                      You have been granted access to specific modules by the
                      event owner. You can view and manage content within your
                      assigned modules only.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Module Permissions Grid */}
            {currentMember.role === "COLLABORATOR" &&
              currentMember.modulePermissions && (
                <div>
                  <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Your Module Permissions (
                    {currentMember.modulePermissions.length})
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {currentMember.modulePermissions.map((module) => {
                      const display = MODULE_DISPLAY[module] ?? {
                        label: module,
                        description: "Module access",
                      };
                      return (
                        <div
                          key={module}
                          className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20"
                        >
                          <div className="flex items-start gap-2">
                            <HiCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                            <div className="flex-1">
                              <p className="font-semibold text-green-900 dark:text-green-100">
                                {display.label}
                              </p>
                              <p className="mt-1 text-sm text-green-700 dark:text-green-200">
                                {display.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {currentMember.modulePermissions.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No modules assigned yet. Contact the event owner to
                      request access.
                    </p>
                  )}
                </div>
              )}
          </div>
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
    </div>
  );
}
