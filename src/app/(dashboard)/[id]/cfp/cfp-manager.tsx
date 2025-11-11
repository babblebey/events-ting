/**
 * CfpManager Component
 *
 * Client component for managing Call for Papers.
 * Handles CFP creation, submission list, and review workflow.
 *
 * @module app/(dashboard)/[id]/cfp/cfp-manager
 */

"use client";

import { useState } from "react";
import {
  Button,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Alert,
} from "flowbite-react";
import { api } from "@/trpc/react";
import { CfpForm } from "@/components/cfp/cfp-form";
import { SubmissionCard } from "@/components/cfp/submission-card";
import { ReviewPanel } from "@/components/cfp/review-panel";
import type { CallForPapers } from "generated/prisma";
import type { RouterOutputs } from "@/trpc/react";
import { HiPlus, HiLockClosed, HiLockOpen, HiInformationCircle } from "react-icons/hi";
import { LuCircleAlert } from "react-icons/lu";

type CfpSubmission =
  RouterOutputs["cfp"]["listSubmissions"]["submissions"][number];

interface CfpManagerProps {
  eventId: string;
  eventName: string;
  eventSlug: string;
  initialCfp?: CallForPapers | null;
}

export function CfpManager({
  eventId,
  eventName,
  eventSlug,
  initialCfp,
}: CfpManagerProps) {
  const [showCfpForm, setShowCfpForm] = useState(false);
  const [showCloseCfpModal, setShowCloseCfpModal] = useState(false);
  const [showReopenCfpModal, setShowReopenCfpModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<CfpSubmission | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "accepted" | "rejected"
  >("all");

  const utils = api.useUtils();

  // Query CFP data with infinite scroll
  const {
    data: cfpData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.cfp.listSubmissions.useInfiniteQuery(
    {
      cfpId: initialCfp?.id ?? "",
      status: statusFilter,
      limit: 12,
    },
    {
      enabled: !!initialCfp,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  // Query all submissions for counts (no pagination needed for stats)
  const { data: allCfpData } = api.cfp.listSubmissions.useInfiniteQuery(
    {
      cfpId: initialCfp?.id ?? "",
      status: "all",
      limit: 100,
    },
    {
      enabled: !!initialCfp,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  const closeCfpMutation = api.cfp.close.useMutation({
    onSuccess: () => {
      setShowCloseCfpModal(false);
      void utils.cfp.listSubmissions.invalidate();
    },
  });

  const reopenCfpMutation = api.cfp.reopen.useMutation({
    onSuccess: () => {
      setShowReopenCfpModal(false);
      void utils.cfp.listSubmissions.invalidate();
    },
  });

  const submissions = cfpData?.pages.flatMap((page) => page.submissions) ?? [];
  const allSubmissions =
    allCfpData?.pages.flatMap((page) => page.submissions) ?? [];
  const totalCount = allSubmissions.length;
  const pendingCount = allSubmissions.filter(
    (s) => s.status === "pending",
  ).length;
  const acceptedCount = allSubmissions.filter(
    (s) => s.status === "accepted",
  ).length;
  const rejectedCount = allSubmissions.filter(
    (s) => s.status === "rejected",
  ).length;

  const handleCloseCfp = () => {
    if (!initialCfp) return;
    closeCfpMutation.mutate({ cfpId: initialCfp.id });
  };

  const cfpUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/events/${eventSlug}/cfp`;
  const isOpen = initialCfp?.status === "open";
  const deadlinePassed = initialCfp
    ? new Date(initialCfp.deadline) < new Date()
    : false;

  // No CFP exists yet
  if (!initialCfp) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <HiPlus className="h-8 w-8 text-blue-600 dark:text-blue-300" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          No Call for Papers Yet
        </h3>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Open a Call for Papers to invite speakers to submit session proposals
          for {eventName}.
        </p>
        <Button onClick={() => setShowCfpForm(true)} className="m-auto">
          Open Call for Papers
        </Button>

        {/* CFP Creation Modal */}
        <Modal
          show={showCfpForm}
          onClose={() => setShowCfpForm(false)}
          size="3xl"
        >
          <ModalHeader>Open Call for Papers</ModalHeader>
          <ModalBody>
            <CfpForm
              eventId={eventId}
              onSuccess={() => {
                setShowCfpForm(false);
                void utils.cfp.listSubmissions.invalidate();
              }}
              onCancel={() => setShowCfpForm(false)}
            />
          </ModalBody>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CFP Status Banner */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Call for Papers
              </h2>
              <Badge
                color={isOpen ? "success" : "gray"}
                size="sm"
                icon={isOpen ? HiLockOpen : HiLockClosed}
              >
                {isOpen ? "Open" : "Closed"}
              </Badge>
              {deadlinePassed && isOpen && (
                <Badge color="warning" size="sm">
                  Deadline Passed
                </Badge>
              )}
            </div>

            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>
                <span className="font-medium">Deadline:</span>{" "}
                {new Date(initialCfp.deadline).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              <p>
                <span className="font-medium">Public Submission Page:</span>{" "}
                <a
                  href={cfpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {cfpUrl}
                </a>
              </p>
            </div>

            {/* Submission Stats */}
            <div className="mt-4 flex gap-6">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalCount}
                </p>
                <p className="text-xs text-gray-500">Total Submissions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {pendingCount}
                </p>
                <p className="text-xs text-gray-500">Pending Review</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {acceptedCount}
                </p>
                <p className="text-xs text-gray-500">Accepted</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {rejectedCount}
                </p>
                <p className="text-xs text-gray-500">Rejected</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button color="gray" size="sm" onClick={() => setShowCfpForm(true)}>
              Edit Settings
            </Button>
            {isOpen ? (
              <Button
                color="red"
                size="sm"
                onClick={() => setShowCloseCfpModal(true)}
                disabled={closeCfpMutation.isPending}
              >
                Close CFP
              </Button>
            ) : !deadlinePassed ? (
              <Button
                color="success"
                size="sm"
                onClick={() => setShowReopenCfpModal(true)}
                disabled={reopenCfpMutation.isPending}
              >
                Reopen CFP
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Submissions List */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            <Button
              color={statusFilter === "all" ? "blue" : "gray"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              All ({totalCount})
            </Button>
            <Button
              color={statusFilter === "pending" ? "blue" : "gray"}
              size="sm"
              onClick={() => setStatusFilter("pending")}
            >
              Pending ({pendingCount})
            </Button>
            <Button
              color={statusFilter === "accepted" ? "blue" : "gray"}
              size="sm"
              onClick={() => setStatusFilter("accepted")}
            >
              Accepted ({acceptedCount})
            </Button>
            <Button
              color={statusFilter === "rejected" ? "blue" : "gray"}
              size="sm"
              onClick={() => setStatusFilter("rejected")}
            >
              Rejected ({rejectedCount})
            </Button>
          </div>
        </div>

        <div className="p-6">
          {submissions.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p className="text-lg">No submissions yet</p>
              <p className="mt-2 text-sm">
                {isOpen
                  ? "Share the CFP link with potential speakers to start receiving proposals."
                  : "Reopen the CFP to accept new submissions."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {submissions.map((submission) => (
                  <SubmissionCard
                    key={submission.id}
                    submission={submission}
                    onClick={() => setSelectedSubmission(submission)}
                  />
                ))}
              </div>

              {hasNextPage && (
                <div className="flex justify-center pt-4">
                  <Button
                    color="light"
                    onClick={() => void fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage
                      ? "Loading..."
                      : "Load More Submissions"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit CFP Modal */}
      <Modal
        show={showCfpForm}
        onClose={() => setShowCfpForm(false)}
        size="3xl"
      >
        <ModalHeader>Edit Call for Papers</ModalHeader>
        <ModalBody>
          <CfpForm
            eventId={eventId}
            existingCfp={initialCfp}
            onSuccess={() => {
              setShowCfpForm(false);
              void utils.cfp.listSubmissions.invalidate();
            }}
            onCancel={() => setShowCfpForm(false)}
          />
        </ModalBody>
      </Modal>

      {/* Review Submission Modal */}
      <Modal
        show={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        size="4xl"
      >
        <ModalHeader>Review Submission</ModalHeader>
        <ModalBody>
          {selectedSubmission && (
            <ReviewPanel
              submission={selectedSubmission}
              onSuccess={() => {
                setSelectedSubmission(null);
                void utils.cfp.listSubmissions.invalidate();
              }}
            />
          )}
        </ModalBody>
      </Modal>

      {/* Close CFP Confirmation Modal */}
      <Modal
        show={showCloseCfpModal}
        onClose={() => setShowCloseCfpModal(false)}
      >
        <ModalHeader>Close Call for Papers</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Alert color="warning" icon={LuCircleAlert}>
              <span className="font-medium">Warning:</span> Speakers will no
              longer be able to submit proposals. This action cannot be undone.
            </Alert>
            <p className="text-gray-600 dark:text-gray-300">
              Are you sure you want to close the Call for Papers?
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="red"
            onClick={handleCloseCfp}
            disabled={closeCfpMutation.isPending}
          >
            {closeCfpMutation.isPending ? "Closing..." : "Close CFP"}
          </Button>
          <Button
            color="gray"
            onClick={() => setShowCloseCfpModal(false)}
            disabled={closeCfpMutation.isPending}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      {/* Reopen CFP Confirmation Modal */}
      <Modal
        show={showReopenCfpModal}
        onClose={() => setShowReopenCfpModal(false)}
      >
        <ModalHeader>Reopen Call for Papers</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Alert color="info" icon={HiInformationCircle}>
              <span className="font-medium">Info:</span> Speakers will be able to
              submit proposals again until the deadline on{" "}
              {initialCfp && new Date(initialCfp.deadline).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}.
            </Alert>
            <p className="text-gray-600 dark:text-gray-300">
              Are you sure you want to reopen the Call for Papers?
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="success"
            onClick={() => {
              if (!initialCfp) return;
              reopenCfpMutation.mutate({ cfpId: initialCfp.id });
            }}
            disabled={reopenCfpMutation.isPending}
          >
            {reopenCfpMutation.isPending ? "Reopening..." : "Reopen CFP"}
          </Button>
          <Button
            color="gray"
            onClick={() => setShowReopenCfpModal(false)}
            disabled={reopenCfpMutation.isPending}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
