/**
 * Team Permissions Cleanup Utilities
 *
 * Handles automatic permission revocation when modules are disabled or removed
 * from event configuration. This is a silent operation (no email notifications).
 *
 * NOTE: Currently, all modules are always enabled in the platform.
 * This utility is prepared for future implementation when event-level
 * module configuration is added (e.g., disabling CFP if not using that feature).
 */

import { db } from "@/server/db";
import type { ModuleName } from "@/lib/validators";
import { MODULE_NAMES } from "@/lib/validators";

/**
 * Remove specific module permission from all team members of an event
 * This is called when a module is disabled at the event level
 *
 * @param eventId - The event ID
 * @param disabledModule - The module being disabled
 * @returns Count of team members affected
 *
 * @example
 * ```ts
 * // When CFP module is disabled for an event
 * await revokeModulePermissionForEvent(eventId, "CFP");
 * ```
 */
export async function revokeModulePermissionForEvent(
  eventId: string,
  disabledModule: ModuleName,
): Promise<{ affectedCount: number; success: boolean }> {
  try {
    // Find all team members who have this module permission
    const membersWithModule = await db.teamMember.findMany({
      where: {
        eventId,
        status: "ACTIVE",
        role: "COLLABORATOR", // Owners always have full access, don't modify
        modulePermissions: {
          has: disabledModule,
        },
      },
      select: {
        id: true,
        modulePermissions: true,
      },
    });

    if (membersWithModule.length === 0) {
      return {
        affectedCount: 0,
        success: true,
      };
    }

    // Remove the disabled module from each member's permissions
    await Promise.all(
      membersWithModule.map(async (member) => {
        const updatedPermissions = member.modulePermissions.filter(
          (module) => module !== disabledModule,
        );

        await db.teamMember.update({
          where: { id: member.id },
          data: {
            modulePermissions: updatedPermissions,
            updatedAt: new Date(),
          },
        });
      }),
    );

    console.log(
      `[PermissionsCleanup] Revoked ${disabledModule} permission from ${membersWithModule.length} team member(s) for event ${eventId}`,
    );

    return {
      affectedCount: membersWithModule.length,
      success: true,
    };
  } catch (error) {
    console.error(
      `[PermissionsCleanup] Error revoking module permission:`,
      error,
    );
    return {
      affectedCount: 0,
      success: false,
    };
  }
}

/**
 * Remove multiple module permissions from all team members of an event
 * Useful when disabling multiple modules at once
 *
 * @param eventId - The event ID
 * @param disabledModules - Array of modules being disabled
 * @returns Count of team members affected and breakdown by module
 */
export async function revokeMultipleModulePermissions(
  eventId: string,
  disabledModules: ModuleName[],
): Promise<{
  totalAffected: number;
  byModule: Record<string, number>;
  success: boolean;
}> {
  try {
    const results: Record<string, number> = {};
    let totalAffected = 0;

    for (const moduleName of disabledModules) {
      const result = await revokeModulePermissionForEvent(eventId, moduleName);
      results[moduleName] = result.affectedCount;
      totalAffected += result.affectedCount;
    }

    return {
      totalAffected,
      byModule: results,
      success: true,
    };
  } catch (error) {
    console.error(
      `[PermissionsCleanup] Error revoking multiple module permissions:`,
      error,
    );
    return {
      totalAffected: 0,
      byModule: {},
      success: false,
    };
  }
}

/**
 * Validate and clean up invalid module permissions for all team members
 * Removes any module permissions that are not in the valid MODULE_NAMES list
 * Useful for data cleanup or after module removal from the platform
 *
 * @param eventId - Optional event ID to scope cleanup, or cleanup all events
 * @returns Count of team members cleaned up
 */
export async function cleanupInvalidModulePermissions(
  eventId?: string,
): Promise<{ affectedCount: number; success: boolean }> {
  try {
    // Find all team members with potential invalid permissions
    const members = await db.teamMember.findMany({
      where: {
        ...(eventId ? { eventId } : {}),
        status: "ACTIVE",
        role: "COLLABORATOR",
      },
      select: {
        id: true,
        modulePermissions: true,
      },
    });

    let affectedCount = 0;
    const validModules = new Set(MODULE_NAMES);

    for (const member of members) {
      // Filter out any invalid module names
      const validPermissions = member.modulePermissions.filter((module) =>
        validModules.has(module as ModuleName),
      );

      // Only update if there were invalid permissions
      if (validPermissions.length !== member.modulePermissions.length) {
        await db.teamMember.update({
          where: { id: member.id },
          data: {
            modulePermissions: validPermissions,
            updatedAt: new Date(),
          },
        });
        affectedCount++;
      }
    }

    if (affectedCount > 0) {
      console.log(
        `[PermissionsCleanup] Cleaned up invalid permissions for ${affectedCount} team member(s)${eventId ? ` in event ${eventId}` : " across all events"}`,
      );
    }

    return {
      affectedCount,
      success: true,
    };
  } catch (error) {
    console.error(
      `[PermissionsCleanup] Error cleaning up invalid permissions:`,
      error,
    );
    return {
      affectedCount: 0,
      success: false,
    };
  }
}

/**
 * Example usage in event settings update handler:
 *
 * ```typescript
 * // In src/server/api/routers/event.ts updateSettings procedure
 *
 * if (input.disabledModules && input.disabledModules.length > 0) {
 *   // Silently revoke permissions for disabled modules
 *   await revokeMultipleModulePermissions(
 *     input.eventId,
 *     input.disabledModules
 *   );
 * }
 * ```
 *
 * Future event model extension:
 *
 * ```prisma
 * model Event {
 *   // ... existing fields
 *   enabledModules String[] @default([
 *     "OVERVIEW",
 *     "ATTENDEES",
 *     "TICKETS",
 *     "SCHEDULE",
 *     "SPEAKERS",
 *     "CFP",
 *     "COMMUNICATIONS"
 *   ])
 * }
 * ```
 */
