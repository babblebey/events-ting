/**
 * CfpSubmissionForm Component
 * 
 * Public form for submitting session proposals to a Call for Papers.
 * Used by potential speakers to submit their talk/workshop proposals.
 * 
 * @module components/cfp/cfp-submission-form
 */

"use client";

import { useState } from "react";
import { Button, Label, TextInput, Textarea, Select } from "flowbite-react";
import { api } from "@/trpc/react";
import type { CfpSubmission } from "generated/prisma";

interface CfpSubmissionFormProps {
  cfpId: string;
  requiredFields?: string[];
  onSuccess?: (submission: CfpSubmission) => void;
}

const SESSION_FORMATS = [
  { value: "talk", label: "Talk (Standard presentation)" },
  { value: "workshop", label: "Workshop (Hands-on session)" },
  { value: "panel", label: "Panel (Group discussion)" },
  { value: "lightning", label: "Lightning Talk (Quick presentation)" },
];

const DURATION_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "60 minutes" },
  { value: 90, label: "90 minutes" },
  { value: 120, label: "120 minutes" },
];

export function CfpSubmissionForm({ cfpId, requiredFields = [], onSuccess }: CfpSubmissionFormProps) {
  // Proposal fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sessionFormat, setSessionFormat] = useState<string>("talk");
  const [duration, setDuration] = useState<number>(30);

  // Speaker fields
  const [speakerName, setSpeakerName] = useState("");
  const [speakerEmail, setSpeakerEmail] = useState("");
  const [speakerBio, setSpeakerBio] = useState("");
  const [speakerPhoto, setSpeakerPhoto] = useState("");
  
  // Social links
  const [speakerTwitter, setSpeakerTwitter] = useState("");
  const [speakerGithub, setSpeakerGithub] = useState("");
  const [speakerLinkedin, setSpeakerLinkedin] = useState("");
  const [speakerWebsite, setSpeakerWebsite] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitProposalMutation = api.cfp.submitProposal.useMutation({
    onSuccess: (data) => {
      setSuccess(true);
      onSuccess?.(data);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!title.trim() || title.length < 5) {
      setError("Proposal title must be at least 5 characters");
      return;
    }

    if (!description.trim() || description.length < 50) {
      setError("Proposal description must be at least 50 characters");
      return;
    }

    if (!speakerName.trim()) {
      setError("Speaker name is required");
      return;
    }

    if (!speakerEmail.trim()) {
      setError("Speaker email is required");
      return;
    }

    if (requiredFields.includes("bio") && (!speakerBio.trim() || speakerBio.length < 50)) {
      setError("Speaker bio must be at least 50 characters");
      return;
    }

    if (requiredFields.includes("photo") && !speakerPhoto.trim()) {
      setError("Speaker photo is required for this event");
      return;
    }

    submitProposalMutation.mutate({
      cfpId,
      title,
      description,
      sessionFormat: sessionFormat as "talk" | "workshop" | "panel" | "lightning",
      duration,
      speakerName,
      speakerEmail,
      speakerBio,
      ...(speakerPhoto && { speakerPhoto }),
      ...(speakerTwitter && { speakerTwitter }),
      ...(speakerGithub && { speakerGithub }),
      ...(speakerLinkedin && { speakerLinkedin }),
      ...(speakerWebsite && { speakerWebsite }),
    });
  };

  if (success) {
    return (
      <div className="rounded-lg border border-green-300 bg-green-50 p-8 text-center">
        <div className="mb-4 text-5xl">✅</div>
        <h3 className="mb-2 text-xl font-semibold text-green-900">
          Proposal Submitted!
        </h3>
        <p className="text-green-800">
          Thank you for your submission! We&apos;ll review your proposal and 
          get back to you via email with our decision.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Proposal Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Proposal Details
        </h3>

        {/* Title */}
        <div>
          <Label htmlFor="title" className="mb-2 block">
            Session Title <span className="text-red-600">*</span>
          </Label>
          <TextInput
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Building Scalable APIs with tRPC"
            required
            maxLength={200}
            disabled={submitProposalMutation.isPending}
          />
          <p className="mt-1 text-sm text-gray-500">
            {title.length}/200 characters
          </p>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description" className="mb-2 block">
            Session Description <span className="text-red-600">*</span>
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what attendees will learn from your session..."
            rows={6}
            required
            maxLength={2000}
            disabled={submitProposalMutation.isPending}
          />
          <p className="mt-1 text-sm text-gray-500">
            {description.length}/2000 characters (minimum 50)
          </p>
        </div>

        {/* Session Format */}
        {requiredFields.includes("sessionFormat") && (
          <div>
            <Label htmlFor="sessionFormat" className="mb-2 block">
              Session Format <span className="text-red-600">*</span>
            </Label>
            <Select
              id="sessionFormat"
              value={sessionFormat}
              onChange={(e) => setSessionFormat(e.target.value)}
              required
              disabled={submitProposalMutation.isPending}
            >
              {SESSION_FORMATS.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Duration */}
        {requiredFields.includes("duration") && (
          <div>
            <Label htmlFor="duration" className="mb-2 block">
              Duration <span className="text-red-600">*</span>
            </Label>
            <Select
              id="duration"
              value={duration.toString()}
              onChange={(e) => setDuration(Number(e.target.value))}
              required
              disabled={submitProposalMutation.isPending}
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* Speaker Section */}
      <div className="space-y-6 border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Speaker Information
        </h3>

        {/* Name */}
        <div>
          <Label htmlFor="speakerName" className="mb-2 block">
            Your Name <span className="text-red-600">*</span>
          </Label>
          <TextInput
            id="speakerName"
            type="text"
            value={speakerName}
            onChange={(e) => setSpeakerName(e.target.value)}
            placeholder="John Doe"
            required
            maxLength={100}
            disabled={submitProposalMutation.isPending}
          />
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="speakerEmail" className="mb-2 block">
            Your Email <span className="text-red-600">*</span>
          </Label>
          <TextInput
            id="speakerEmail"
            type="email"
            value={speakerEmail}
            onChange={(e) => setSpeakerEmail(e.target.value)}
            placeholder="john@example.com"
            required
            disabled={submitProposalMutation.isPending}
          />
          <p className="mt-1 text-sm text-gray-500">
            We&apos;ll use this email to notify you about your submission status.
          </p>
        </div>

        {/* Bio */}
        {requiredFields.includes("bio") && (
          <div>
            <Label htmlFor="speakerBio" className="mb-2 block">
              Your Bio <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="speakerBio"
              value={speakerBio}
              onChange={(e) => setSpeakerBio(e.target.value)}
              placeholder="Tell us about yourself, your experience, and what makes you qualified to speak on this topic..."
              rows={5}
              required={requiredFields.includes("bio")}
              maxLength={1000}
              disabled={submitProposalMutation.isPending}
            />
            <p className="mt-1 text-sm text-gray-500">
              {speakerBio.length}/1000 characters (minimum 50)
            </p>
          </div>
        )}

        {/* Photo */}
        {requiredFields.includes("photo") && (
          <div>
            <Label htmlFor="speakerPhoto" className="mb-2 block">
              Photo URL <span className="text-red-600">*</span>
            </Label>
            <TextInput
              id="speakerPhoto"
              type="url"
              value={speakerPhoto}
              onChange={(e) => setSpeakerPhoto(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              required={requiredFields.includes("photo")}
              disabled={submitProposalMutation.isPending}
            />
            <p className="mt-1 text-sm text-gray-500">
              A professional photo that will be displayed with your profile.
            </p>
          </div>
        )}
      </div>

      {/* Social Links Section */}
      <div className="space-y-6 border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Social Links <span className="text-sm font-normal text-gray-500">(Optional)</span>
        </h3>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="speakerTwitter" className="mb-2 block">
              Twitter/X Handle
            </Label>
            <TextInput
              id="speakerTwitter"
              type="text"
              value={speakerTwitter}
              onChange={(e) => setSpeakerTwitter(e.target.value)}
              placeholder="@username"
              maxLength={100}
              disabled={submitProposalMutation.isPending}
            />
          </div>

          <div>
            <Label htmlFor="speakerGithub" className="mb-2 block">
              GitHub Username
            </Label>
            <TextInput
              id="speakerGithub"
              type="text"
              value={speakerGithub}
              onChange={(e) => setSpeakerGithub(e.target.value)}
              placeholder="username"
              maxLength={100}
              disabled={submitProposalMutation.isPending}
            />
          </div>

          <div>
            <Label htmlFor="speakerLinkedin" className="mb-2 block">
              LinkedIn Profile
            </Label>
            <TextInput
              id="speakerLinkedin"
              type="text"
              value={speakerLinkedin}
              onChange={(e) => setSpeakerLinkedin(e.target.value)}
              placeholder="linkedin.com/in/username"
              maxLength={100}
              disabled={submitProposalMutation.isPending}
            />
          </div>

          <div>
            <Label htmlFor="speakerWebsite" className="mb-2 block">
              Personal Website
            </Label>
            <TextInput
              id="speakerWebsite"
              type="url"
              value={speakerWebsite}
              onChange={(e) => setSpeakerWebsite(e.target.value)}
              placeholder="https://yourwebsite.com"
              disabled={submitProposalMutation.isPending}
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end border-t pt-6">
        <Button
          type="submit"
          size="lg"
          disabled={submitProposalMutation.isPending}
        >
          Submit Proposal
        </Button>
      </div>
    </form>
  );
}
