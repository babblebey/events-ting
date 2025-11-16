/**
 * Permission Revoked Handler Component
 * 
 * Monitors for 403/FORBIDDEN errors during active sessions and handles
 * permission revocation gracefully by:
 * 1. Allowing current save operations to complete (grace period)
 * 2. Showing notification about permission changes
 * 3. Redirecting to accessible modules or access denied page
 * 
 * @module components/team/permission-revoked-handler
 */

"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/components/ui/toast-provider";
import { api } from "@/trpc/react";

interface PermissionRevokedHandlerProps {
  eventId: string;
  children: React.ReactNode;
}

/**
 * Component that wraps event pages and handles permission revocation
 * during active sessions
 */
export function PermissionRevokedHandler({
  eventId,
  children,
}: PermissionRevokedHandlerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  // Get current user's permissions
  const { data: currentMember, error } = api.team.getCurrentMember.useQuery(
    { eventId },
    {
      // Poll every 30 seconds to detect permission changes
      refetchInterval: 30000,
      // Cache for 25 seconds to avoid redundant fetches between polls
      staleTime: 25 * 1000, // 25 seconds
      gcTime: 60 * 1000, // 1 minute
      // Don't retry on error
      retry: false,
      // Keep previous data while refetching for smoother UX
      placeholderData: (previousData) => previousData,
    },
  );

  useEffect(() => {
    // Handle FORBIDDEN errors (403)
    if (error?.data?.code === "FORBIDDEN") {
      toast.warning(
        "Access Revoked",
        "Your access to this event has been changed. Redirecting...",
        7000,
      );

      // Redirect to access denied page after a short delay
      // This allows any in-progress operations to complete
      setTimeout(() => {
        router.push(`/${eventId}/access-denied`);
      }, 2000);
      return;
    }

    // Check if user lost access to current module
    if (currentMember) {
      // Extract module from pathname (e.g., /eventId/cfp -> cfp)
      const pathParts = pathname.split("/");
      const currentModule = pathParts[pathParts.length - 1];

      // Map pathname to module names
      const moduleMap: Record<string, string> = {
        attendees: "ATTENDEES",
        tickets: "TICKETS",
        schedule: "SCHEDULE",
        speakers: "SPEAKERS",
        cfp: "CFP",
        communications: "COMMUNICATIONS",
      };

      const moduleName = currentModule ? moduleMap[currentModule] : undefined;

      // If on a module page and no longer have permission
      if (
        moduleName &&
        currentMember.role !== "OWNER" &&
        !currentMember.modulePermissions.includes(moduleName)
      ) {
        toast.warning(
          "Permission Changed",
          "You no longer have access to this module. Redirecting to an available module...",
          5000,
        );

        // Find first available module to redirect to
        const availableModule = currentMember.modulePermissions[0];
        
        if (availableModule) {
          const moduleRoutes: Record<string, string> = {
            ATTENDEES: "attendees",
            TICKETS: "tickets",
            SCHEDULE: "schedule",
            SPEAKERS: "speakers",
            CFP: "cfp",
            COMMUNICATIONS: "communications",
            OVERVIEW: "",
          };

          const route = moduleRoutes[availableModule];
          setTimeout(() => {
            router.push(`/${eventId}${route ? `/${route}` : ""}`);
          }, 1500);
        } else {
          // No modules available, redirect to access denied
          setTimeout(() => {
            router.push(`/${eventId}/access-denied`);
          }, 1500);
        }
      }
    }
  }, [error, currentMember, eventId, pathname, router, toast]);

  return <>{children}</>;
}
