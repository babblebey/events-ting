/**
 * useTrpcError Hook
 * 
 * Provides standardized error handling for tRPC mutations and queries.
 * Specifically handles:
 * - FORBIDDEN (403) errors from permission changes
 * - UNAUTHORIZED (401) errors
 * - Validation errors
 * - Generic errors
 * 
 * @module hooks/useTrpcError
 */

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast-provider";
import type { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@/server/api/root";

interface UseTrpcErrorOptions {
  /** Event ID for redirect on permission errors */
  eventId?: string;
  /** Custom error messages for specific error codes */
  customMessages?: Partial<Record<string, string>>;
  /** Whether to show toast notifications for errors */
  showToast?: boolean;
}

/**
 * Hook for handling tRPC errors consistently across the application
 * 
 * @example
 * ```tsx
 * const handleError = useTrpcError({ eventId, showToast: true });
 * 
 * const mutation = api.cfp.submitProposal.useMutation({
 *   onError: handleError,
 * });
 * ```
 */
export function useTrpcError(options: UseTrpcErrorOptions = {}) {
  const {
    eventId,
    customMessages = {},
    showToast = true,
  } = options;

  const router = useRouter();
  const toast = useToast();

  const handleError = useCallback(
    (error: TRPCClientError<AppRouter>) => {
      const errorCode = error.data?.code;

      // Handle FORBIDDEN (403) - Permission revoked
      if (errorCode === "FORBIDDEN") {
        if (showToast) {
          toast.error(
            "Permission Denied",
            customMessages.FORBIDDEN ??
              "Your permissions have changed. You can no longer perform this action.",
          );
        }

        // Redirect to access denied page if eventId provided
        if (eventId) {
          setTimeout(() => {
            router.push(`/${eventId}/access-denied`);
          }, 2000);
        }
        return;
      }

      // Handle UNAUTHORIZED (401) - Not logged in
      if (errorCode === "UNAUTHORIZED") {
        if (showToast) {
          toast.error(
            "Authentication Required",
            customMessages.UNAUTHORIZED ??
              "Please sign in to continue.",
          );
        }
        router.push("/auth/signin");
        return;
      }

      // Handle NOT_FOUND (404)
      if (errorCode === "NOT_FOUND") {
        if (showToast) {
          toast.error(
            "Not Found",
            customMessages.NOT_FOUND ??
              error.message,
          );
        }
        return;
      }

      // Handle CONFLICT (409)
      if (errorCode === "CONFLICT") {
        if (showToast) {
          toast.error(
            "Conflict",
            customMessages.CONFLICT ??
              error.message,
          );
        }
        return;
      }

      // Handle BAD_REQUEST (400) - Usually validation errors
      if (errorCode === "BAD_REQUEST") {
        if (showToast) {
          toast.error(
            "Invalid Request",
            customMessages.BAD_REQUEST ??
              error.message,
          );
        }
        return;
      }

      // Handle generic errors
      if (showToast) {
        toast.error(
          "Error",
          error.message ?? "An unexpected error occurred. Please try again.",
        );
      }
    },
    [eventId, customMessages, showToast, router, toast],
  );

  return handleError;
}
