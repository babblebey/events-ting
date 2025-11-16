import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface TeamInvitationProps {
  inviteeName: string;
  organizerName: string;
  eventName: string;
  modulePermissions: string[];
  acceptUrl: string;
  expiresAt: Date;
}

export const TeamInvitation = ({
  inviteeName,
  organizerName,
  eventName,
  modulePermissions,
  acceptUrl,
  expiresAt,
}: TeamInvitationProps) => {
  const formattedExpiry = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
  }).format(new Date(expiresAt));

  return (
    <Html>
      <Head />
      <Preview>You&apos;re invited to collaborate on {eventName}! 🤝</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>Team Invitation 🤝</Heading>

            <Text style={paragraph}>Hi {inviteeName},</Text>

            <Text style={paragraph}>
              <strong>{organizerName}</strong> has invited you to join the team
              for <strong>{eventName}</strong>.
            </Text>

            <Section style={infoBox}>
              <Text style={infoLabel}>Your Access:</Text>
              {modulePermissions.map((module) => (
                <Text key={module} style={moduleItem}>
                  ✓ {module}
                </Text>
              ))}
            </Section>

            <Text style={paragraph}>
              By accepting this invitation, you&apos;ll be able to help manage the
              assigned modules for this event.
            </Text>

            <Button style={button} href={acceptUrl}>
              Accept Invitation
            </Button>

            <Hr style={hr} />

            <Text style={footer}>
              This invitation expires on {formattedExpiry}.
            </Text>

            <Text style={footer}>
              If you don&apos;t recognize this event or didn&apos;t expect this
              invitation, you can safely ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default TeamInvitation;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const box = {
  padding: "0 48px",
};

const heading = {
  fontSize: "32px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#1f2937",
  marginBottom: "24px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#374151",
  marginBottom: "16px",
};

const infoBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "24px",
  marginTop: "24px",
  marginBottom: "24px",
};

const infoLabel = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  marginBottom: "12px",
  marginTop: "0",
};

const moduleItem = {
  fontSize: "16px",
  fontWeight: "500",
  color: "#1f2937",
  marginTop: "0",
  marginBottom: "8px",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  width: "100%",
  padding: "12px 20px",
  marginTop: "24px",
  marginBottom: "24px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footer = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "1.5",
  marginBottom: "8px",
};
