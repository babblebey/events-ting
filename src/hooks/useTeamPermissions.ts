/**
 * useTeamPermissions Hook
 * 
 * Client-side hook for checking team member permissions for an event.
 * Provides utilities to determine if the current user has access to specific modules.
 * 
 * @module hooks/useTeamPermissions
 */

"use client";

import { api } from "@/trpc/react";
import type { ModuleName } from "@/lib/validators";

/**
 * Hook to check team member permissions for an event
 * 
 * @param eventId - The event ID to check permissions for
 * @returns Object containing permission check utilities and member data
 * 
 * @example
 * ```tsx
 * const { hasPermission, isOwner, isLoading } = useTeamPermissions(eventId);
 * 
 * if (isLoading) return <LoadingSpinner />;
 * 
 * if (hasPermission("CFP")) {
 *   return <CFPSubmissionsList />;
 * }
 * 
 * return <AccessDenied />;
 * ```
 */
export function useTeamPermissions(eventId: string) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const { data: member, isLoading, error } = api.team.getCurrentMember.useQuery(
    { eventId },
    {
      // Stale time: permissions don't change frequently
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Keep in cache for session duration
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime in React Query v4)
      // Retry on failure
      retry: 2,
    }
  );

  /**
   * Check if the current user has permission to access a specific module
   * 
   * @param moduleName - The module to check access for
   * @returns true if user has permission, false otherwise
   * 
   * Rules:
   * - No member record = no access
   * - Member status must be ACTIVE
   * - OWNER role = full access to all modules
   * - COLLABORATOR role = only modules in modulePermissions array
   */
  const hasPermission = (moduleName: ModuleName): boolean => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!member?.status || member.status !== "ACTIVE") {
      return false;
    }

    // Owners have full access
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (member.role === "OWNER") {
      return true;
    }

    // Collaborators only have access to assigned modules
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return member.modulePermissions.includes(moduleName);
  };

  /**
   * Check if user is the event owner
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const isOwner = member?.role === "OWNER" && member?.status === "ACTIVE";

  /**
   * Check if user is an active collaborator (not owner)
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const isCollaborator = member?.role === "COLLABORATOR" && member?.status === "ACTIVE";

  /**
   * Check if user has any active membership (owner or collaborator)
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const hasAccess = member?.status === "ACTIVE";

  /**
   * Get list of modules the user has access to
   */
  const allowedModules: ModuleName[] = 
    isOwner 
      ? ["OVERVIEW", "ATTENDEES", "TICKETS", "SCHEDULE", "SPEAKERS", "CFP", "COMMUNICATIONS"]
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      : (member?.modulePermissions as ModuleName[] | undefined) ?? [];

  return {
    /** The team member data */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    member,
    /** Check if user has permission for a specific module */
    hasPermission,
    /** True if user is the event owner */
    isOwner,
    /** True if user is a collaborator (not owner) */
    isCollaborator,
    /** True if user has any active access to the event */
    hasAccess,
    /** List of modules the user can access */
    allowedModules,
    /** True while loading member data */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    isLoading,
    /** Error if permission check failed */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    error,
  };
}
