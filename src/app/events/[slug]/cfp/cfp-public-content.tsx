/**
 * CfpPublicContent Component
 * 
 * Client component that fetches and displays CFP information
 * and handles the submission form.
 * 
 * @module app/events/[slug]/cfp/cfp-public-content
 */

"use client";

import { useState } from "react";
import { CfpSubmissionForm } from "@/components/cfp/cfp-submission-form";
import { Badge } from "flowbite-react";
import { HiClock, HiCheckCircle } from "react-icons/hi";

interface CfpPublicContentProps {
  eventId: string;
  eventName: string;
}

export function CfpPublicContent({ eventId, eventName }: CfpPublicContentProps) {
  // For MVP, we'll use a simplified approach
  // In a full implementation, we'd need a public getCfp procedure
  // For now, we'll assume CFP exists and handle errors gracefully
  
  // Mock CFP data - in real implementation, fetch this via tRPC
  const [cfpId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Since we don't have a public getCfp endpoint yet, we'll show a message
  // This will be improved in T069-T070 when we add more CFP features

  if (!cfpId) {
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
          Please check back soon or contact the event organizers for more information.
        </p>
      </div>
    );
  }

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
          We&apos;ll review your submission and notify you via email with our decision.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Guidelines Section - Will be populated from CFP data */}
      <div className="rounded-lg border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-white">
          Submission Guidelines
        </h3>
        <div className="prose prose-gray max-w-none dark:prose-invert">
          <p className="text-gray-600 dark:text-gray-400">
            Please submit your session proposal using the form below. 
            We&apos;re looking for engaging talks, workshops, and panels that will 
            provide value to our attendees.
          </p>
        </div>
      </div>

      {/* Deadline Notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900">
        <div className="flex items-center gap-2">
          <HiClock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Submission deadline: TBD
          </p>
        </div>
      </div>

      {/* Submission Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
          Submit Your Proposal
        </h3>
        
        {/* Note: This form will work once we have the CFP ID */}
        <div className="text-gray-500 dark:text-gray-400">
          The submission form will be available once the Call for Papers opens.
        </div>
        
        {/* Uncomment when CFP ID is available
        <CfpSubmissionForm
          cfpId={cfpId}
          requiredFields={["bio", "sessionFormat", "duration"]}
          onSuccess={() => setIsSubmitted(true)}
        />
        */}
      </div>
    </div>
  );
}
