"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import NProgress from "nprogress";

/**
 * ProgressBarProvider
 *
 * Provides a top-loading progress bar for route transitions and API requests.
 * The progress bar automatically appears when navigating between pages or when
 * making backend requests (queries/mutations).
 *
 * Features:
 * - Route change detection via usePathname and useSearchParams
 * - Backend request detection via React Query (tRPC)
 * - Handles full page reloads/hard navigations via browser events
 * - Configurable NProgress settings (speed, easing, etc.)
 * - No spinner (cleaner UI)
 * - Respects prefers-reduced-motion (via CSS)
 * - Uses hardcoded color (#1c64f2) for progress bar
 *
 * @param children - Child components to render
 */
export function ProgressBarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track active queries and mutations
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();

  // Use refs to avoid stale closures in event handlers
  const isFetchingRef = useRef(isFetching);
  const isMutatingRef = useRef(isMutating);

  useEffect(() => {
    isFetchingRef.current = isFetching;
    isMutatingRef.current = isMutating;
  }, [isFetching, isMutating]);

  useEffect(() => {
    // Configure NProgress on mount
    NProgress.configure({
      showSpinner: false, // Hide spinner for cleaner look
      trickleSpeed: 200, // Speed of trickle animation (ms)
      minimum: 0.08, // Starting percentage (8%)
      easing: "ease", // CSS easing function
      speed: 200, // Animation speed (ms)
      trickle: true, // Gradually increase progress
    });

    // Intercept link clicks to start progress immediately
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest("a");

      if (anchor?.href) {
        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(anchor.href, window.location.href);

        // Only start progress for same-origin navigation
        if (currentUrl.origin === targetUrl.origin) {
          // Check if it's not just a hash change
          if (
            currentUrl.pathname !== targetUrl.pathname ||
            currentUrl.search !== targetUrl.search
          ) {
            NProgress.start();
          }
        }
      }
    };

    // Intercept form element changes (select, input, etc.) that trigger backend requests
    const handleFormChange = (event: Event) => {
      const target = event.target as HTMLElement;

      // Only proceed if there are active API requests (using refs to avoid stale closure)
      if (!isFetchingRef.current && !isMutatingRef.current) {
        return;
      }

      // Check if the changed element is a form control (select, input, etc.)
      if (
        target instanceof HTMLSelectElement ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        // Start progress bar immediately on change
        // The API request effect will keep it going until requests complete
        NProgress.start();
      }
    };

    // Handle full page reloads/hard navigations
    const handleBeforeUnload = () => {
      NProgress.start();
    };

    // Listen for browser navigation events
    document.addEventListener("click", handleAnchorClick);
    document.addEventListener("change", handleFormChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // For pages that are already loaded when this mounts
    if (document.readyState === "complete") {
      NProgress.done();
    }

    return () => {
      document.removeEventListener("click", handleAnchorClick);
      document.removeEventListener("change", handleFormChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    // Start progress bar when route changes (client-side navigation)
    NProgress.start();

    // Complete progress after a short delay
    // This allows the page to render before completing
    const timer = setTimeout(() => {
      NProgress.done();
    }, 100);

    // Cleanup: ensure progress bar is completed
    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, [pathname, searchParams]);

  // Handle API requests (queries and mutations)
  useEffect(() => {
    const isLoading = isFetching > 0 || isMutating > 0;

    if (isLoading) {
      NProgress.start();
    } else {
      NProgress.done();
    }
  }, [isFetching, isMutating]);

  return <>{children}</>;
}
