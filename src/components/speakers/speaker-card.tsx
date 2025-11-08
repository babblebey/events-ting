"use client";

/**
 * SpeakerCard Component
 * Displays speaker profile in a card format for grid displays
 */

import { Card, Badge } from "flowbite-react";
import { Mail, Twitter, Github, Linkedin, Globe } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface SpeakerCardProps {
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
    speakerSessions?: Array<{
      id: string;
      scheduleEntry: {
        id: string;
        title: string;
        startTime: Date;
        endTime: Date;
        track?: string | null;
      };
    }>;
  };
  eventSlug?: string;
  showSessions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function SpeakerCard({
  speaker,
  eventSlug,
  showSessions = true,
  onEdit,
  onDelete,
}: SpeakerCardProps) {
  const sessionCount = speaker.speakerSessions?.length ?? 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="flex flex-col items-center gap-4">
        {/* Profile Photo */}
        <div className="relative">
          {speaker.photo ? (
            <Image
              src={speaker.photo}
              alt={speaker.name}
              width={96}
              height={96}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-3xl font-bold text-gray-500 dark:text-gray-400">
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

        {/* Name */}
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {speaker.name}
          </h3>
          {sessionCount > 0 && showSessions && (
            <Badge color="info" className="mt-1">
              {sessionCount} Session{sessionCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Bio */}
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center line-clamp-3">
          {speaker.bio}
        </p>

        {/* Social Links */}
        <div className="flex gap-3 items-center justify-center">
          {speaker.email && (
            <a
              href={`mailto:${speaker.email}`}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Email"
            >
              <Mail className="h-5 w-5" />
            </a>
          )}
          {speaker.twitter && (
            <a
              href={`https://twitter.com/${speaker.twitter.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
            </a>
          )}
          {speaker.github && (
            <a
              href={`https://github.com/${speaker.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
          )}
          {speaker.linkedin && (
            <a
              href={speaker.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          )}
          {speaker.website && (
            <a
              href={speaker.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Website"
            >
              <Globe className="h-5 w-5" />
            </a>
          )}
        </div>

        {/* Sessions (if showing) */}
        {showSessions && speaker.speakerSessions && speaker.speakerSessions.length > 0 && (
          <div className="w-full border-t pt-3 mt-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Speaking Sessions
            </p>
            <div className="space-y-2">
              {speaker.speakerSessions.slice(0, 2).map((session) => (
                <div
                  key={session.id}
                  className="text-sm text-gray-600 dark:text-gray-300"
                >
                  <p className="font-medium line-clamp-1">
                    {session.scheduleEntry.title}
                  </p>
                  {session.scheduleEntry.track && (
                    <Badge color="gray" size="xs" className="mt-1">
                      {session.scheduleEntry.track}
                    </Badge>
                  )}
                </div>
              ))}
              {speaker.speakerSessions.length > 2 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  +{speaker.speakerSessions.length - 2} more session
                  {speaker.speakerSessions.length - 2 !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons (for organizer view) */}
        {(onEdit ?? onDelete) && (
          <div className="flex gap-2 w-full pt-2 border-t">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex-1 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Delete
              </button>
            )}
          </div>
        )}

        {/* View Details Link (for public view) */}
        {!onEdit && !onDelete && eventSlug && (
          <Link
            href={`/events/${eventSlug}/speakers/${speaker.id}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View Full Profile →
          </Link>
        )}
      </div>
    </Card>
  );
}
