import {
  Body,
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

interface TeamAccessRemovedProps {
  collaboratorName: string;
  organizerName: string;
  eventName: string;
}

export const TeamAccessRemoved = ({
  collaboratorName,
  organizerName,
  eventName,
}: TeamAccessRemovedProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your access to {eventName} has been removed</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>Access Removed</Heading>

            <Text style={paragraph}>Hi {collaboratorName},</Text>

            <Text style={paragraph}>
              <strong>{organizerName}</strong> has removed your access to{" "}
              <strong>{eventName}</strong>.
            </Text>

            <Text style={paragraph}>
              You no longer have permission to view or manage this event. If you
              believe this was done in error, please contact the event organizer
              directly.
            </Text>

            <Hr style={hr} />

            <Text style={footer}>
              Thank you for your contributions to the event during your time on
              the team.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default TeamAccessRemoved;

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
