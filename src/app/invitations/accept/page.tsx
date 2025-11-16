"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { HiOutlineRefresh, HiCheckCircle, HiXCircle, HiClock, HiMail, HiShieldExclamation } from "react-icons/hi";

type InvitationState = 
  | { status: "loading" }
  | { status: "needs-auth"; eventName?: string; modules?: string[] }
  | { status: "accepting" }
  | { status: "success"; eventName: string; eventSlug: string; modules: string[] }
  | { status: "declining" }
  | { status: "declined"; eventName: string }
  | { status: "error"; message: string };

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status: sessionStatus } = useSession();
  const token = searchParams.get("token");

  const [invitationState, setInvitationState] = useState<InvitationState>({
    status: "loading",
  });
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const acceptInvitation = api.team.acceptInvitation.useMutation({
    onSuccess: (data) => {
      setInvitationState({
        status: "success",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        eventName: data.event.name,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        eventSlug: data.event.slug,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        modules: data.teamMember.modulePermissions as string[],
      });
    },
    onError: (error) => {
      setInvitationState({
        status: "error",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        message: error.message,
      });
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const declineInvitation = api.team.declineInvitation.useMutation({
    onSuccess: (data) => {
      setInvitationState({
        status: "declined",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        eventName: data.eventName,
      });
    },
    onError: (error) => {
      setInvitationState({
        status: "error",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        message: error.message,
      });
    },
  });

  const handleAcceptance = useCallback(() => {
    if (token && invitationState.status === "loading") {
      setInvitationState({ status: "accepting" });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      acceptInvitation.mutate({ token });
    }
  }, [token, invitationState.status, acceptInvitation]);

  useEffect(() => {
    // Check if token is present
    if (!token) {
      setInvitationState({
        status: "error",
        message: "Invalid invitation link. No token provided.",
      });
      return;
    }

    // Check authentication status
    if (sessionStatus === "loading") {
      return; // Still checking auth
    }

    if (sessionStatus === "unauthenticated") {
      // Redirect to sign in with callback to this page
      setInvitationState({ status: "needs-auth" });
      return;
    }

    // User is authenticated, proceed with acceptance
    if (sessionStatus === "authenticated") {
      handleAcceptance();
    }
  }, [token, sessionStatus, handleAcceptance]);

  const handleSignIn = () => {
    void signIn(undefined, {
      callbackUrl: `/invitations/accept?token=${token}`,
    });
  };

  const handleGoToEvent = () => {
    if (invitationState.status === "success") {
      router.push(`/${invitationState.eventSlug}/overview`);
    }
  };

  const handleDeclineClick = () => {
    setShowDeclineConfirm(true);
  };

  const handleDeclineConfirm = () => {
    if (token) {
      setInvitationState({ status: "declining" });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      declineInvitation.mutate({ token });
    }
  };

  const handleDeclineCancel = () => {
    setShowDeclineConfirm(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Team Invitation
          </h2>
        </div>

        <div className="rounded-lg bg-white px-8 py-10 shadow dark:bg-gray-800">
          {/* Loading State */}
          {invitationState.status === "loading" && (
            <div className="flex flex-col items-center space-y-4">
              <HiOutlineRefresh className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-center text-gray-600 dark:text-gray-300">
                Verifying invitation...
              </p>
            </div>
          )}

          {/* Needs Authentication */}
          {invitationState.status === "needs-auth" && (
            <div className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <HiMail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Sign in to accept invitation
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    You need to sign in to accept this team invitation.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSignIn}
                className="flex w-full justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Sign in to continue
              </button>

              <button
                onClick={handleDeclineClick}
                className="flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Decline Invitation
              </button>

              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Don&apos;t have an account?{" "}
                <Link
                  href={`/auth/register?callbackUrl=${encodeURIComponent(`/invitations/accept?token=${token}`)}`}
                  className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  Create one
                </Link>
              </p>
            </div>
          )}

          {/* Accepting State */}
          {invitationState.status === "accepting" && (
            <div className="flex flex-col items-center space-y-4">
              <HiOutlineRefresh className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-center text-gray-600 dark:text-gray-300">
                Accepting invitation...
              </p>
            </div>
          )}

          {/* Declining State */}
          {invitationState.status === "declining" && (
            <div className="flex flex-col items-center space-y-4">
              <HiOutlineRefresh className="h-12 w-12 animate-spin text-orange-600" />
              <p className="text-center text-gray-600 dark:text-gray-300">
                Declining invitation...
              </p>
            </div>
          )}

          {/* Declined State */}
          {invitationState.status === "declined" && (
            <div className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
                  <HiXCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Invitation Declined
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    You&apos;ve declined the invitation to join{" "}
                    <span className="font-semibold">{invitationState.eventName}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  The organizer has been notified of your decision. If you change your mind, 
                  you can ask them to send you a new invitation.
                </p>
              </div>

              <Link
                href="/dashboard"
                className="flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Go to Dashboard
              </Link>
            </div>
          )}

          {/* Success State */}
          {invitationState.status === "success" && (
            <div className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <HiCheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Invitation Accepted!
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    You&apos;ve successfully joined the team for{" "}
                    <span className="font-semibold">{invitationState.eventName}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
                <h4 className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-300">
                  Your Access:
                </h4>
                <ul className="space-y-1">
                  {invitationState.modules.map((module) => (
                    <li
                      key={module}
                      className="flex items-center text-sm text-blue-800 dark:text-blue-300"
                    >
                      <HiCheckCircle className="mr-2 h-4 w-4" />
                      {module}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleGoToEvent}
                className="flex w-full justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Go to Event Dashboard
              </button>

              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                The organizer has been notified of your acceptance.
              </p>
            </div>
          )}

          {/* Error State */}
          {invitationState.status === "error" && (
            <div className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                  <HiXCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Unable to Accept Invitation
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {invitationState.message}
                  </p>
                </div>
              </div>

              <div className="rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
                <div className="flex">
                  <div className="shrink-0">
                    <HiClock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">
                      What you can do:
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm text-yellow-800 dark:text-yellow-300">
                      <li>• Contact the event organizer for a new invitation</li>
                      <li>• Check if the invitation link is correct</li>
                      <li>• Ensure the invitation hasn&apos;t expired</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Link
                href="/dashboard"
                className="flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>

        {/* Decline Confirmation Modal */}
        {showDeclineConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
              <div className="flex items-start space-x-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                  <HiShieldExclamation className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Decline Invitation?
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Are you sure you want to decline this invitation? The organizer will be notified, 
                    and you won&apos;t be able to access this event unless they send you a new invitation.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleDeclineCancel}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeclineConfirm}
                  className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                >
                  Decline Invitation
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Having trouble? Contact the event organizer.
        </p>
      </div>
    </div>
  );
}
