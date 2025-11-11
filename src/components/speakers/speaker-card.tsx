"use client";

/**
 * SpeakerCard Component
 * Displays speaker profile in a card format for grid displays
 */

import { Card, Badge } from "flowbite-react";
import { FaXTwitter } from "react-icons/fa6";
import { HiOutlineMail, HiOutlineGlobeAlt } from "react-icons/hi";
import { AiOutlineLinkedin, AiOutlineGithub } from "react-icons/ai";

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
    <Card className="transition-shadow hover:shadow-lg">
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
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
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
        <p className="line-clamp-3 text-center text-sm text-gray-600 dark:text-gray-300">
          {speaker.bio}
        </p>

        {/* Social Links */}
        <div className="flex items-center justify-center gap-3">
          {speaker.email && (
            <a
              href={`mailto:${speaker.email}`}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Email"
            >
              <HiOutlineMail className="h-5 w-5" />
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
              <FaXTwitter className="h-5 w-5" />
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
              <AiOutlineGithub className="h-5 w-5" />
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
              <AiOutlineLinkedin className="h-5 w-5" />
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
              <HiOutlineGlobeAlt className="h-5 w-5" />
            </a>
          )}
        </div>

        {/* Sessions (if showing) */}
        {showSessions &&
          speaker.speakerSessions &&
          speaker.speakerSessions.length > 0 && (
            <div className="mt-2 w-full border-t pt-3">
              <p className="mb-2 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
                Speaking Sessions
              </p>
              <div className="space-y-2">
                {speaker.speakerSessions.slice(0, 2).map((session) => (
                  <div
                    key={session.id}
                    className="text-sm text-gray-600 dark:text-gray-300"
                  >
                    <p className="line-clamp-1 font-medium">
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
          <div className="flex w-full gap-2 border-t pt-2">
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
