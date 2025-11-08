"use client";

/**
 * SpeakerProfile Component
 * Full speaker profile view showing bio, social links, and complete session list
 */

import { Card, Badge } from "flowbite-react";
import { Mail, Twitter, Github, Linkedin, Globe, Calendar, MapPin, Clock } from "lucide-react";
import Link from "next/link";
import { formatDate, formatTimeRange } from "@/lib/utils/date";

interface SpeakerProfileProps {
  speaker: {
    id: string;
    name: string;
    bio: string;
    email: string;
    photo?: string | null;
    twitter?: string | null;
    github?: string | null;
    linkedin?: string | null;
    website?: string | null;
    event: {
      id: string;
      name: string;
      slug: string;
      timezone: string;
    };
    speakerSessions?: Array<{
      id: string;
      role?: string | null;
      scheduleEntry: {
        id: string;
        title: string;
        description: string;
        startTime: Date;
        endTime: Date;
        location?: string | null;
        track?: string | null;
        trackColor?: string | null;
        sessionType?: string | null;
      };
    }>;
    cfpSubmissions?: Array<{
      id: string;
      title: string;
      status: string;
    }>;
  };
  eventSlug: string;
  showBackLink?: boolean;
}

export function SpeakerProfile({ speaker, eventSlug, showBackLink = true }: SpeakerProfileProps) {
  const sessions = speaker.speakerSessions ?? [];
  const upcomingSessions = sessions.filter(
    (s) => new Date(s.scheduleEntry.startTime) > new Date()
  );
  const pastSessions = sessions.filter(
    (s) => new Date(s.scheduleEntry.startTime) <= new Date()
  );

  return (
    <div className="space-y-6">
      {/* Back Link */}
      {showBackLink && (
        <Link
          href={`/events/${eventSlug}/speakers`}
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to Speakers
        </Link>
      )}

      {/* Profile Header */}
      <Card>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Photo */}
          <div className="shrink-0">
            {speaker.photo ? (
              <img
                src={speaker.photo}
                alt={speaker.name}
                className="h-32 w-32 rounded-full object-cover"
              />
            ) : (
              <div className="h-32 w-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-4xl font-bold text-gray-500 dark:text-gray-400">
                  {speaker.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {speaker.name}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Speaking at {speaker.event.name}
            </p>

            {/* Social Links */}
            <div className="flex gap-3 mt-4">
              {speaker.email && (
                <a
                  href={`mailto:${speaker.email}`}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </a>
              )}
              {speaker.twitter && (
                <a
                  href={`https://twitter.com/${speaker.twitter.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  <Twitter className="h-4 w-4" />
                  Twitter
                </a>
              )}
              {speaker.github && (
                <a
                  href={`https://github.com/${speaker.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              )}
              {speaker.linkedin && (
                <a
                  href={speaker.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </a>
              )}
              {speaker.website && (
                <a
                  href={speaker.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  <Globe className="h-4 w-4" />
                  Website
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Biography */}
        <div className="mt-6 border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            About
          </h2>
          <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
            {speaker.bio}
          </p>
        </div>
      </Card>

      {/* Sessions */}
      {sessions.length > 0 && (
        <Card>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Sessions
          </h2>

          {upcomingSessions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                Upcoming
              </h3>
              <div className="space-y-4">
                {upcomingSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    timezone={speaker.event.timezone}
                  />
                ))}
              </div>
            </div>
          )}

          {pastSessions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                Past Sessions
              </h3>
              <div className="space-y-4">
                {pastSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    timezone={speaker.event.timezone}
                  />
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* No Sessions Message */}
      {sessions.length === 0 && (
        <Card>
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            This speaker has no scheduled sessions yet.
          </p>
        </Card>
      )}
    </div>
  );
}

/**
 * SessionCard - Display individual session in speaker profile
 */
function SessionCard({
  session,
  timezone,
}: {
  session: {
    id: string;
    role?: string | null;
    scheduleEntry: {
      id: string;
      title: string;
      description: string;
      startTime: Date;
      endTime: Date;
      location?: string | null;
      track?: string | null;
      trackColor?: string | null;
      sessionType?: string | null;
    };
  };
  timezone: string;
}) {
  const { scheduleEntry, role } = session;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {scheduleEntry.title}
            </h4>
            {role && role !== "speaker" && (
              <Badge color="info" size="sm">
                {role}
              </Badge>
            )}
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            {scheduleEntry.description}
          </p>

          <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(scheduleEntry.startTime, timezone, "PPP")}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTimeRange(scheduleEntry.startTime, scheduleEntry.endTime, timezone)}
            </div>
            {scheduleEntry.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {scheduleEntry.location}
              </div>
            )}
          </div>
        </div>

        {scheduleEntry.track && (
          <Badge
            color="gray"
            style={
              scheduleEntry.trackColor
                ? {
                    backgroundColor: scheduleEntry.trackColor,
                    color: "#fff",
                  }
                : undefined
            }
          >
            {scheduleEntry.track}
          </Badge>
        )}
      </div>
    </div>
  );
}
