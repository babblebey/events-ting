/**
 * SubmissionCard Component
 * 
 * Displays a CFP submission in the organizer's review dashboard.
 * Shows proposal details, speaker info, and review status.
 * 
 * @module components/cfp/submission-card
 */

"use client";

import { Badge, Card } from "flowbite-react";
import type { RouterOutputs } from "@/trpc/react";

type CfpSubmission = RouterOutputs["cfp"]["listSubmissions"]["submissions"][number];

interface SubmissionCardProps {
  submission: CfpSubmission;
  onClick?: () => void;
}

const STATUS_COLORS = {
  pending: "warning",
  accepted: "success",
  rejected: "failure",
} as const;

const STATUS_LABELS = {
  pending: "Pending Review",
  accepted: "Accepted",
  rejected: "Rejected",
} as const;

const SESSION_FORMAT_LABELS = {
  talk: "Talk",
  workshop: "Workshop",
  panel: "Panel",
  lightning: "Lightning Talk",
} as const;

export function SubmissionCard({ submission, onClick }: SubmissionCardProps) {
  const submittedDate = new Date(submission.submittedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-lg"
      onClick={onClick}
    >
      {/* Header with Status */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            {submission.title}
          </h3>
          <div className="flex flex-wrap gap-2">
            <Badge color={STATUS_COLORS[submission.status as keyof typeof STATUS_COLORS]}>
              {STATUS_LABELS[submission.status as keyof typeof STATUS_LABELS]}
            </Badge>
            <Badge color="gray">
              {SESSION_FORMAT_LABELS[submission.sessionFormat as keyof typeof SESSION_FORMAT_LABELS]}
            </Badge>
            <Badge color="gray">{submission.duration} min</Badge>
          </div>
        </div>

        {/* Review Score */}
        {submission.reviewScore && (
          <div className="ml-4 flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
              {submission.reviewScore}
            </div>
            <span className="mt-1 text-xs text-gray-500">Score</span>
          </div>
        )}
      </div>

      {/* Description Preview */}
      <p className="mb-4 line-clamp-3 text-sm text-gray-600 dark:text-gray-400">
        {submission.description}
      </p>

      {/* Speaker Info */}
      <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
        <div className="mb-1 flex items-center gap-2">
          {submission.speakerPhoto && (
            <div className="h-8 w-8 overflow-hidden rounded-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={submission.speakerPhoto}
                alt={submission.speakerName}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {submission.speakerName}
            </p>
            <p className="text-xs text-gray-500">{submission.speakerEmail}</p>
          </div>
        </div>
        
        {/* Social Links */}
        {(submission.speakerTwitter ?? submission.speakerGithub ?? submission.speakerLinkedin ?? submission.speakerWebsite) && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {submission.speakerTwitter && (
              <a
                href={`https://twitter.com/${submission.speakerTwitter.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Twitter
              </a>
            )}
            {submission.speakerGithub && (
              <a
                href={`https://github.com/${submission.speakerGithub}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                GitHub
              </a>
            )}
            {submission.speakerLinkedin && (
              <a
                href={`https://linkedin.com/in/${submission.speakerLinkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                LinkedIn
              </a>
            )}
            {submission.speakerWebsite && (
              <a
                href={submission.speakerWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Website
              </a>
            )}
          </div>
        )}
      </div>

      {/* Review Notes Preview */}
      {submission.reviewNotes && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-900">
          <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
            Review Notes:
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-yellow-700 dark:text-yellow-300">
            {submission.reviewNotes}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-gray-500">
        <span>Submitted {submittedDate}</span>
        {submission.reviewedAt && (
          <span>
            Reviewed{" "}
            {new Date(submission.reviewedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>
    </Card>
  );
}
