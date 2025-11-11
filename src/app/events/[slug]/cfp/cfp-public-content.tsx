/**
 * CfpPublicContent Component
 *
 * Displays CFP information and handles the submission form.
 *
 * @module app/events/[slug]/cfp/cfp-public-content
 */

"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import { CfpSubmissionForm } from "@/components/cfp/cfp-submission-form";
import { HiClock, HiCheckCircle, HiXCircle } from "react-icons/hi";
import type { JsonValue } from "@prisma/client/runtime/library";

interface CfpPublicContentProps {
  cfp: {
    id: string;
    guidelines: string;
    deadline: Date;
    status: string;
    requiredFields: JsonValue;
  } | null;
  eventId: string;
  eventName: string;
}

export function CfpPublicContent({ cfp, eventName }: CfpPublicContentProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);

  // No CFP exists for this event
  if (!cfp) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
          <HiClock className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          Call for Papers Information
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          The Call for Papers for {eventName} is currently being prepared.
          <br />
          Please check back soon or contact the event organizers for more
          information.
        </p>
      </div>
    );
  }

  // CFP is closed or deadline has passed
  const isClosed =
    cfp.status === "closed" || new Date(cfp.deadline) < new Date();

  if (isClosed) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-12 text-center dark:border-red-700 dark:bg-red-900">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-800">
          <HiXCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="mb-2 text-2xl font-semibold text-red-900 dark:text-red-100">
          Call for Papers Closed
        </h3>
        <p className="text-red-800 dark:text-red-200">
          The Call for Papers for {eventName} has closed.
          <br />
          {cfp.status === "closed"
            ? "Thank you for your interest!"
            : `The submission deadline was ${new Date(
                cfp.deadline,
              ).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}.`}
        </p>
      </div>
    );
  }

  // Successful submission
  if (isSubmitted) {
    return (
      <div className="rounded-lg border border-green-300 bg-green-50 p-12 text-center dark:border-green-700 dark:bg-green-900">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-800">
          <HiCheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="mb-2 text-2xl font-semibold text-green-900 dark:text-green-100">
          Proposal Submitted!
        </h3>
        <p className="text-green-800 dark:text-green-200">
          Thank you for submitting your proposal to {eventName}.
          <br />
          We&apos;ll review your submission and notify you via email with our
          decision.
        </p>
      </div>
    );
  }

  // CFP is open - show submission form
  return (
    <div className="space-y-8">
      {/* Guidelines Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-white">
          Submission Guidelines
        </h3>
        <div className="prose dark:prose-invert max-w-none">
          <Markdown>{cfp.guidelines}</Markdown>
        </div>
      </div>

      {/* Deadline Notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900">
        <div className="flex items-center gap-2">
          <HiClock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Submission deadline:{" "}
            {new Date(cfp.deadline).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Required Fields Notice */}
      {Array.isArray(cfp.requiredFields) && cfp.requiredFields.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
            📝 Required information:{" "}
            {cfp.requiredFields
              .map((field: unknown) => {
                const fieldStr = String(field);
                const fieldLabels: Record<string, string> = {
                  bio: "Speaker Bio",
                  sessionFormat: "Session Format",
                  duration: "Session Duration",
                  photo: "Speaker Photo",
                };
                return fieldLabels[fieldStr] ?? fieldStr;
              })
              .join(", ")}
          </p>
        </div>
      )}

      {/* Submission Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
          Submit Your Proposal
        </h3>

        <CfpSubmissionForm
          cfpId={cfp.id}
          requiredFields={
            Array.isArray(cfp.requiredFields)
              ? (cfp.requiredFields as Array<
                  "bio" | "sessionFormat" | "duration" | "photo"
                >)
              : []
          }
          onSuccess={() => setIsSubmitted(true)}
        />
      </div>
    </div>
  );
}
