/**
 * Team Collaboration Email Helpers
 * Helper functions for sending team-related emails
 */

import { sendEmail } from "@/server/services/email";
import { TeamInvitation } from "emails/team-invitation";
import { TeamInvitationAccepted } from "emails/team-invitation-accepted";
import { TeamInvitationDeclined } from "emails/team-invitation-declined";
import { TeamPermissionChanged } from "emails/team-permission-changed";
import { TeamAccessRemoved } from "emails/team-access-removed";

interface TeamInvitationEmailData {
  to: string;
  inviteeName: string;
  eventName: string;
  eventId: string;
  organizerName: string;
  token: string;
  modules: string[];
  expiresAt: Date;
}

interface TeamInvitationResponseEmailData {
  to: string;
  eventName: string;
  eventId: string;
  inviteeName: string;
  inviteeEmail: string;
  modules: string[];
  organizerName: string;
}

interface TeamPermissionChangedEmailData {
  to: string;
  collaboratorName: string;
  organizerName: string;
  eventName: string;
  eventId: string;
  previousPermissions: string[];
  newPermissions: string[];
}

interface TeamAccessRemovedEmailData {
  to: string;
  collaboratorName: string;
  eventName: string;
  organizerName: string;
  modules: string[];
}

/**
 * Send team invitation email
 */
export async function sendTeamInvitationEmail(data: TeamInvitationEmailData) {
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invitations/accept?token=${data.token}`;

  return sendEmail({
    to: data.to,
    subject: `You're invited to collaborate on ${data.eventName}`,
    react: TeamInvitation({
      inviteeName: data.inviteeName,
      eventName: data.eventName,
      organizerName: data.organizerName,
      acceptUrl,
      modulePermissions: data.modules,
      expiresAt: data.expiresAt,
    }),
    tags: [
      { name: "category", value: "team-invitation" },
      { name: "eventId", value: data.eventId },
    ],
  });
}

/**
 * Send invitation accepted notification to organizer
 */
export async function sendTeamInvitationAcceptedEmail(
  data: TeamInvitationResponseEmailData,
) {
  const teamUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${data.eventId}/settings/team`;

  return sendEmail({
    to: data.to,
    subject: `${data.inviteeName} accepted your invitation to ${data.eventName}`,
    react: TeamInvitationAccepted({
      organizerName: "Organizer", // Will be populated from context
      eventName: data.eventName,
      collaboratorName: data.inviteeName,
      collaboratorEmail: data.inviteeEmail,
      modulePermissions: data.modules,
      teamUrl,
    }),
    tags: [
      { name: "category", value: "team-invitation-accepted" },
      { name: "eventId", value: data.eventId },
    ],
  });
}

/**
 * Send invitation declined notification to organizer
 */
export async function sendTeamInvitationDeclinedEmail(
  data: TeamInvitationResponseEmailData,
) {
  const teamUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${data.eventId}/settings/team`;

  return sendEmail({
    to: data.to,
    subject: `${data.inviteeName} declined your invitation to ${data.eventName}`,
    react: TeamInvitationDeclined({
      organizerName: data.organizerName,
      eventName: data.eventName,
      collaboratorEmail: data.inviteeEmail,
      teamUrl,
    }),
    tags: [
      { name: "category", value: "team-invitation-declined" },
      { name: "eventId", value: data.eventId },
    ],
  });
}

/**
 * Send permission changed notification to collaborator
 */
export async function sendTeamPermissionChangedEmail(
  data: TeamPermissionChangedEmailData,
) {
  const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${data.eventId}`;

  return sendEmail({
    to: data.to,
    subject: `Your permissions for ${data.eventName} have been updated`,
    react: TeamPermissionChanged({
      collaboratorName: data.collaboratorName,
      organizerName: data.organizerName,
      eventName: data.eventName,
      previousPermissions: data.previousPermissions,
      newPermissions: data.newPermissions,
      eventUrl,
    }),
    tags: [
      { name: "category", value: "team-permission-changed" },
      { name: "eventId", value: data.eventId },
    ],
  });
}

/**
 * Send access removed notification to collaborator
 */
export async function sendTeamAccessRemovedEmail(
  data: TeamAccessRemovedEmailData,
) {
  return sendEmail({
    to: data.to,
    subject: `Your access to ${data.eventName} has been removed`,
    react: TeamAccessRemoved({
      collaboratorName: data.collaboratorName,
      eventName: data.eventName,
      organizerName: data.organizerName,
    }),
    tags: [{ name: "category", value: "team-access-removed" }],
  });
}
