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
import { Button, Badge, Tabs, Modal } from "flowbite-react";
import { api } from "@/trpc/react";
import { CfpForm } from "@/components/cfp/cfp-form";
import { SubmissionCard } from "@/components/cfp/submission-card";
import { ReviewPanel } from "@/components/cfp/review-panel";
import type { CallForPapers, CfpSubmission, Speaker } from "generated/prisma";
import { HiPlus, HiLockClosed, HiLockOpen } from "react-icons/hi";

interface CfpManagerProps {
  eventId: string;
  eventName: string;
  eventSlug: string;
  initialCfp?: CallForPapers | null;
  initialSubmissions?: (CfpSubmission & { speaker?: Speaker | null })[];
}

export function CfpManager({
  eventId,
  eventName,
  eventSlug,
  initialCfp,
  initialSubmissions = [],
}: CfpManagerProps) {
  const [showCfpForm, setShowCfpForm] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<
    (CfpSubmission & { speaker?: Speaker | null }) | null
  >(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");

  const utils = api.useUtils();

  // Query CFP data
  const { data: cfpData } = api.cfp.listSubmissions.useQuery(
    {
      cfpId: initialCfp?.id ?? "",
      status: statusFilter,
      limit: 100,
    },
    {
      enabled: !!initialCfp,
      initialData: initialCfp ? { submissions: initialSubmissions, nextCursor: undefined } : undefined,
    }
  );

  const closeCfpMutation = api.cfp.close.useMutation({
    onSuccess: () => {
      void utils.cfp.listSubmissions.invalidate();
    },
  });

  const submissions = cfpData?.submissions ?? [];
  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const acceptedCount = submissions.filter((s) => s.status === "accepted").length;
  const rejectedCount = submissions.filter((s) => s.status === "rejected").length;

  const handleCloseCfp = () => {
    if (!initialCfp) return;
    if (confirm("Are you sure you want to close the Call for Papers? Speakers will no longer be able to submit proposals.")) {
      closeCfpMutation.mutate({ cfpId: initialCfp.id });
    }
  };

  const cfpUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/events/${eventSlug}/cfp`;
  const isOpen = initialCfp?.status === "open";
  const isClosed = initialCfp?.status === "closed";
  const deadlinePassed = initialCfp ? new Date(initialCfp.deadline) < new Date() : false;

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
          Open a Call for Papers to invite speakers to submit session proposals for {eventName}.
        </p>
        <Button onClick={() => setShowCfpForm(true)} className="m-auto">
          Open Call for Papers
        </Button>

        {/* CFP Creation Modal */}
        <Modal show={showCfpForm} onClose={() => setShowCfpForm(false)} size="3xl">
          <Modal.Header>Open Call for Papers</Modal.Header>
          <Modal.Body>
            <CfpForm
              eventId={eventId}
              onSuccess={() => {
                setShowCfpForm(false);
                void utils.cfp.listSubmissions.invalidate();
              }}
              onCancel={() => setShowCfpForm(false)}
            />
          </Modal.Body>
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
              <Badge color={isOpen ? "success" : "gray"} size="sm" icon={isOpen ? HiLockOpen : HiLockClosed}>
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
                <a href={cfpUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {cfpUrl}
                </a>
              </p>
            </div>

            {/* Submission Stats */}
            <div className="mt-4 flex gap-6">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{submissions.length}</p>
                <p className="text-xs text-gray-500">Total Submissions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                <p className="text-xs text-gray-500">Pending Review</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{acceptedCount}</p>
                <p className="text-xs text-gray-500">Accepted</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
                <p className="text-xs text-gray-500">Rejected</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button color="gray" size="sm" onClick={() => setShowCfpForm(true)}>
              Edit Settings
            </Button>
            {isOpen && (
              <Button
                color="failure"
                size="sm"
                onClick={handleCloseCfp}
                disabled={closeCfpMutation.isPending}
              >
                Close CFP
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Submissions List */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <Tabs.Group style="underline">
            <Tabs.Item
              active={statusFilter === "all"}
              title={`All (${submissions.length})`}
              onClick={() => setStatusFilter("all")}
            />
            <Tabs.Item
              active={statusFilter === "pending"}
              title={`Pending (${pendingCount})`}
              onClick={() => setStatusFilter("pending")}
            />
            <Tabs.Item
              active={statusFilter === "accepted"}
              title={`Accepted (${acceptedCount})`}
              onClick={() => setStatusFilter("accepted")}
            />
            <Tabs.Item
              active={statusFilter === "rejected"}
              title={`Rejected (${rejectedCount})`}
              onClick={() => setStatusFilter("rejected")}
            />
          </Tabs.Group>
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {submissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  onClick={() => setSelectedSubmission(submission)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit CFP Modal */}
      <Modal show={showCfpForm} onClose={() => setShowCfpForm(false)} size="3xl">
        <Modal.Header>Edit Call for Papers</Modal.Header>
        <Modal.Body>
          <CfpForm
            eventId={eventId}
            existingCfp={initialCfp}
            onSuccess={() => {
              setShowCfpForm(false);
              void utils.cfp.listSubmissions.invalidate();
            }}
            onCancel={() => setShowCfpForm(false)}
          />
        </Modal.Body>
      </Modal>

      {/* Review Submission Modal */}
      <Modal
        show={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        size="4xl"
      >
        <Modal.Header>Review Submission</Modal.Header>
        <Modal.Body>
          {selectedSubmission && (
            <ReviewPanel
              submission={selectedSubmission}
              onSuccess={() => {
                setSelectedSubmission(null);
                void utils.cfp.listSubmissions.invalidate();
              }}
            />
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
