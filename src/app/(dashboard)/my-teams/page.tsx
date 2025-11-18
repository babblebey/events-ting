/**
 * My Teams Page
 * Shows all events where the current user is a team member (owner or collaborator)
 * Provides overview of user's access across all events
 */

import { api } from "@/trpc/server";
import { Card } from "flowbite-react";
import { MyTeamsList } from "@/components/team/my-teams-list";
import { PermissionExplainerTrigger } from "@/components/team/permission-explainer-trigger";

export default async function MyTeamsPage() {
  const memberships = await api.team.getMyMemberships();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              My Teams
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              View all events where you&apos;re a team member and your access
              permissions
            </p>
          </div>
          <PermissionExplainerTrigger />
        </div>

        {/* Events List */}
        {memberships.length === 0 ? (
          <Card>
            <div className="py-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                You&apos;re not a member of any event teams yet.
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                When you accept an invitation to collaborate on an event, it
                will appear here.
              </p>
            </div>
          </Card>
        ) : (
          <MyTeamsList memberships={memberships} />
        )}
      </div>
    </div>
  );
}
