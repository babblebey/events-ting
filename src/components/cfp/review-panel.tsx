/**
 * ReviewPanel Component
 *
 * Panel for organizers to review CFP submissions.
 * Includes score input, review notes textarea, and accept/reject actions.
 *
 * @module components/cfp/review-panel
 */

"use client";

import { useState } from "react";
import { Button, Label, Textarea } from "flowbite-react";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";

type CfpSubmission =
  RouterOutputs["cfp"]["listSubmissions"]["submissions"][number];

interface ReviewPanelProps {
  submission: CfpSubmission;
  onSuccess?: () => void;
}

export function ReviewPanel({ submission, onSuccess }: ReviewPanelProps) {
  const [reviewScore, setReviewScore] = useState<number | null>(
    submission.reviewScore ?? null,
  );
  const [reviewNotes, setReviewNotes] = useState(submission.reviewNotes ?? "");
  const [error, setError] = useState<string | null>(null);

  const utils = api.useUtils();

  const reviewMutation = api.cfp.reviewSubmission.useMutation({
    onSuccess: () => {
      void utils.cfp.listSubmissions.invalidate();
      onSuccess?.();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const acceptMutation = api.cfp.acceptProposal.useMutation({
    onSuccess: () => {
      void utils.cfp.listSubmissions.invalidate();
      onSuccess?.();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const rejectMutation = api.cfp.rejectProposal.useMutation({
    onSuccess: () => {
      void utils.cfp.listSubmissions.invalidate();
      onSuccess?.();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSaveReview = () => {
    setError(null);
    reviewMutation.mutate({
      submissionId: submission.id,
      reviewScore: reviewScore ?? undefined,
      reviewNotes: reviewNotes || undefined,
    });
  };

  const handleAccept = () => {
    acceptMutation.mutate({
      submissionId: submission.id,
      reviewNotes: reviewNotes || undefined,
    });
  };

  const handleReject = () => {
    rejectMutation.mutate({
      submissionId: submission.id,
      reviewNotes: reviewNotes || undefined,
    });
  };

  const isPending = submission.status === "pending";
  const isAccepted = submission.status === "accepted";
  const isRejected = submission.status === "rejected";

  return (
    <div className="space-y-6">
      {/* Submission Details */}
      <div>
        <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          {submission.title}
        </h2>

        <div className="mb-4 flex flex-wrap gap-3">
          <div className="rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">
            <span className="font-semibold">Format:</span>{" "}
            {submission.sessionFormat}
          </div>
          <div className="rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">
            <span className="font-semibold">Duration:</span>{" "}
            {submission.duration} min
          </div>
          <div className="rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">
            <span className="font-semibold">Status:</span> {submission.status}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
            Description
          </h3>
          <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
            {submission.description}
          </p>
        </div>
      </div>

      {/* Speaker Bio */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
          Speaker Bio
        </h3>
        <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
          {submission.speakerBio}
        </p>
      </div>

      {/* Review Section */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Review Submission
        </h3>

        {/* Score Selection */}
        <div className="mb-4">
          <Label className="mb-2 block">Score (1-5)</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => setReviewScore(score)}
                className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-lg font-bold transition-colors ${
                  reviewScore === score
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                }`}
                disabled={!isPending || reviewMutation.isPending}
              >
                {score}
              </button>
            ))}
          </div>
        </div>

        {/* Review Notes */}
        <div className="mb-4">
          <Label htmlFor="reviewNotes" className="mb-2 block">
            Review Notes
          </Label>
          <Textarea
            id="reviewNotes"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Add your feedback, suggestions, or reasons for your decision..."
            rows={6}
            disabled={!isPending || reviewMutation.isPending}
          />
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {isPending
              ? "These notes will be included in the acceptance/rejection email."
              : "Review notes are saved with the submission."}
          </p>
        </div>

        {/* Save Review Button */}
        {isPending && (
          <Button
            onClick={handleSaveReview}
            color="gray"
            disabled={reviewMutation.isPending}
            className="mb-4"
          >
            Save Review
          </Button>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Accept/Reject Actions */}
        {isPending && (
          <div className="flex gap-3 border-t border-blue-200 pt-4 dark:border-blue-700">
            <Button
              onClick={handleAccept}
              color="success"
              className="flex-1"
              disabled={acceptMutation.isPending || rejectMutation.isPending}
            >
              Accept Proposal
            </Button>
            <Button
              onClick={handleReject}
              color="red"
              className="flex-1"
              disabled={acceptMutation.isPending || rejectMutation.isPending}
            >
              Reject Proposal
            </Button>
          </div>
        )}

        {/* Status Indicators */}
        {isAccepted && (
          <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-center text-green-800 dark:border-green-700 dark:bg-green-900 dark:text-green-200">
            ✓ This proposal has been accepted
            {submission.speaker && ` - Speaker profile created`}
          </div>
        )}

        {isRejected && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-center text-red-800 dark:border-red-700 dark:bg-red-900 dark:text-red-200">
            ✗ This proposal has been rejected
          </div>
        )}
      </div>
    </div>
  );
}
