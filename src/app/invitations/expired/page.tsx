/**
 * Expired Invitation Page
 * Shown when a user tries to accept an invitation that has expired
 * Provides clear messaging and next steps to request a new invitation
 */

import Link from "next/link";
import { Button, Card } from "flowbite-react";
import { AlertCircle, Clock, Home, Mail } from "lucide-react";

export default function ExpiredInvitationPage() {
  return (
    <div className="bg-muted/40 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Clock className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Invitation Expired
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400">
              This invitation link has expired and is no longer valid
            </p>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
                <div className="space-y-2 text-sm text-amber-900">
                  <p className="font-medium">
                    Team invitations expire after 7 days for security reasons.
                  </p>
                  <p>
                    If you still want to join this event&apos;s team, please
                    contact the event organizer to request a new invitation.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <Mail className="h-4 w-4" />
                What to do next
              </h3>
              <ul className="ml-6 list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>Contact the event organizer who sent you the invitation</li>
                <li>
                  Ask them to resend a new invitation from the event&apos;s team
                  settings
                </li>
                <li>
                  The new invitation will be valid for another 7 days from when
                  it&apos;s sent
                </li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button as={Link} href="/" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
            <Button
              as={Link}
              href="mailto:support@events-ting.com"
              color="gray"
              className="w-full"
            >
              <Mail className="mr-2 h-4 w-4" />
              Contact Support
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
