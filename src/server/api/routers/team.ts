/**
 * Team Router
 * Handles team collaboration operations including invitations, permissions, and member management
 */

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const teamRouter = createTRPCRouter({
  // Placeholder procedure - will be implemented in subsequent tasks
  health: protectedProcedure.query(() => {
    return { status: "ok" };
  }),
});
