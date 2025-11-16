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

interface TeamInvitationDeclinedProps {
  organizerName: string;
  collaboratorEmail: string;
  eventName: string;
  teamUrl: string;
}

export const TeamInvitationDeclined = ({
  organizerName,
  collaboratorEmail,
  eventName,
  teamUrl,
}: TeamInvitationDeclinedProps) => {
  return (
    <Html>
      <Head />
      <Preview>Team invitation declined for {eventName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>Invitation Declined</Heading>

            <Text style={paragraph}>Hi {organizerName},</Text>

            <Text style={paragraph}>
              <strong>{collaboratorEmail}</strong> has declined your invitation
              to collaborate on <strong>{eventName}</strong>.
            </Text>

            <Text style={paragraph}>
              If you&apos;d like to reach out to them directly or send another
              invitation in the future, you can do so from your team settings.
            </Text>

            <Button style={button} href={teamUrl}>
              View Team Settings
            </Button>

            <Hr style={hr} />

            <Text style={footer}>
              You can continue managing your event and inviting other
              collaborators as needed.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default TeamInvitationDeclined;

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
