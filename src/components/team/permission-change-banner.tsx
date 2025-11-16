/**
 * Permission Change Banner Component
 *
 * Displays a persistent notification banner when user's permissions
 * have been changed during an active session. Shows what changed
 * and provides quick access to view updated permissions.
 *
 * @module components/team/permission-change-banner
 */

"use client";

import { useState, useEffect } from "react";
import { Alert } from "flowbite-react";
import { HiInformationCircle } from "react-icons/hi";
import Link from "next/link";
import { api } from "@/trpc/react";

interface PermissionChangeBannerProps {
  eventId: string;
  /** Callback when banner is dismissed */
  onDismiss?: () => void;
}

/**
 * Banner that displays when permissions have been modified
 * Checks for permission changes by comparing with localStorage cache
 */
export function PermissionChangeBanner({
  eventId,
  onDismiss,
}: PermissionChangeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [permissionChanges, setPermissionChanges] = useState<{
    added: string[];
    removed: string[];
  }>({ added: [], removed: [] });

  // Get current permissions
  const { data: currentMember } = api.team.getCurrentMember.useQuery(
    { eventId },
    {
      // Poll every 30 seconds to detect changes
      refetchInterval: 30000,
      // Use the same cache as permission-revoked-handler
      staleTime: 25 * 1000, // 25 seconds
      gcTime: 60 * 1000, // 1 minute
      // This will reuse cached data from permission-revoked-handler
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  useEffect(() => {
    if (!currentMember || currentMember.role === "OWNER") {
      // Owners always have full access, no need to show banner
      return;
    }

    // Get cached permissions from localStorage
    const cacheKey = `permissions_${eventId}`;
    const cachedPermissionsStr = localStorage.getItem(cacheKey);

    if (cachedPermissionsStr) {
      try {
        const cachedPermissions = JSON.parse(cachedPermissionsStr) as string[];
        const currentPermissions = currentMember.modulePermissions;

        // Calculate changes
        const added = currentPermissions.filter(
          (p) => !cachedPermissions.includes(p),
        );
        const removed = cachedPermissions.filter(
          (p) => !currentPermissions.includes(p),
        );

        // Show banner if there are changes
        if (added.length > 0 || removed.length > 0) {
          setPermissionChanges({ added, removed });
          setShowBanner(true);
        }
      } catch (error) {
        console.error("Error parsing cached permissions:", error);
      }
    }

    // Update cache with current permissions
    localStorage.setItem(
      cacheKey,
      JSON.stringify(currentMember.modulePermissions),
    );
  }, [currentMember, eventId]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowBanner(false);
    onDismiss?.();
  };

  if (!showBanner || isDismissed || !currentMember) {
    return null;
  }

  const hasAdditions = permissionChanges.added.length > 0;
  const hasRemovals = permissionChanges.removed.length > 0;

  return (
    <Alert
      color="info"
      icon={HiInformationCircle}
      className="mb-6"
      additionalContent={
        <div className="mt-2 space-y-2">
          {hasAdditions && (
            <div>
              <span className="font-semibold text-blue-800 dark:text-blue-300">
                New Access:
              </span>
              <span className="ml-2 text-sm text-blue-700 dark:text-blue-400">
                {permissionChanges.added.join(", ")}
              </span>
            </div>
          )}
          {hasRemovals && (
            <div>
              <span className="font-semibold text-blue-800 dark:text-blue-300">
                Removed Access:
              </span>
              <span className="ml-2 text-sm text-blue-700 dark:text-blue-400">
                {permissionChanges.removed.join(", ")}
              </span>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Link
              href={`/${eventId}/settings/team`}
              className="rounded-lg bg-blue-700 px-3 py-2 text-center text-xs font-medium text-white hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 focus:outline-none dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              View Team Settings
            </Link>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg border border-blue-700 px-3 py-2 text-center text-xs font-medium text-blue-700 hover:bg-blue-800 hover:text-white focus:ring-4 focus:ring-blue-300 focus:outline-none dark:border-blue-600 dark:text-blue-600 dark:hover:bg-blue-600 dark:hover:text-white dark:focus:ring-blue-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      }
      onDismiss={handleDismiss}
    >
      <div className="flex items-center">
        <span className="font-medium">Your permissions have been updated!</span>
      </div>
    </Alert>
  );
}

/**
 * Utility function to clear permission cache
 * Call this when user logs out or switches events
 */
export function clearPermissionCache(eventId: string) {
  const cacheKey = `permissions_${eventId}`;
  localStorage.removeItem(cacheKey);
}

/**
 * Utility function to initialize permission cache
 * Call this when user first accesses an event
 */
export function initializePermissionCache(
  eventId: string,
  permissions: string[],
) {
  const cacheKey = `permissions_${eventId}`;
  localStorage.setItem(cacheKey, JSON.stringify(permissions));
}
