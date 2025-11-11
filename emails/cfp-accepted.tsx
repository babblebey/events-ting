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

interface CfpAcceptedProps {
  speakerName: string;
  eventName: string;
  proposalTitle: string;
  sessionFormat: string;
  duration: number;
  eventUrl: string;
  eventDate?: Date;
}

export const CfpAccepted = ({
  speakerName,
  eventName,
  proposalTitle,
  sessionFormat,
  duration,
  eventUrl,
  eventDate,
}: CfpAcceptedProps) => {
  const formattedDate = eventDate
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
      }).format(new Date(eventDate))
    : null;

  return (
    <Html>
      <Head />
      <Preview>
        Congratulations! Your proposal for {eventName} has been accepted! 🎉
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>Proposal Accepted! 🎉</Heading>

            <Text style={paragraph}>Hi {speakerName},</Text>

            <Text style={paragraph}>
              We&apos;re thrilled to let you know that your proposal for{" "}
              <strong>{eventName}</strong> has been accepted!
            </Text>

            <Section style={acceptedBox}>
              <Text style={acceptedLabel}>✓ ACCEPTED</Text>
              <Text style={proposalTitleStyle}>{proposalTitle}</Text>

              <Section style={detailsGrid}>
                <Section>
                  <Text style={detailLabel}>Format:</Text>
                  <Text style={detailValue}>{sessionFormat}</Text>
                </Section>
                <Section>
                  <Text style={detailLabel}>Duration:</Text>
                  <Text style={detailValue}>{duration} minutes</Text>
                </Section>
              </Section>
            </Section>

            {formattedDate && (
              <Section style={infoBox}>
                <Text style={infoLabel}>Event Date:</Text>
                <Text style={infoValue}>{formattedDate}</Text>
              </Section>
            )}

            <Text style={paragraph}>
              <strong>Next Steps:</strong>
            </Text>

            <Text style={listItem}>
              • We&apos;ll be in touch with more details about your session
            </Text>
            <Text style={listItem}>
              • You&apos;ll receive information about speaker preparation and
              logistics
            </Text>
            <Text style={listItem}>
              • Your speaker profile will be featured on the event website
            </Text>
            <Text style={listItem}>
              • We&apos;ll provide a final schedule closer to the event date
            </Text>

            <Button style={button} href={eventUrl}>
              View Event Details
            </Button>

            <Hr style={hr} />

            <Text style={footer}>
              We&apos;re excited to have you as a speaker at {eventName}! If you
              have any questions or need assistance, please don&apos;t hesitate
              to reach out to the organizing team.
            </Text>

            <Text style={footer}>See you at the event! 🚀</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default CfpAccepted;

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

const acceptedBox = {
  backgroundColor: "#d1fae5",
  borderRadius: "8px",
  border: "2px solid #10b981",
  padding: "24px",
  marginTop: "24px",
  marginBottom: "24px",
};

const acceptedLabel = {
  fontSize: "12px",
  fontWeight: "700",
  color: "#065f46",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  marginBottom: "8px",
  marginTop: "0",
};

const proposalTitleStyle = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#1f2937",
  marginTop: "0",
  marginBottom: "16px",
};

const detailsGrid = {
  display: "flex" as const,
  gap: "24px",
  marginTop: "16px",
};

const detailLabel = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#6b7280",
  marginBottom: "4px",
  marginTop: "0",
};

const detailValue = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1f2937",
  marginTop: "0",
  marginBottom: "0",
  textTransform: "capitalize" as const,
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
  marginBottom: "4px",
  marginTop: "0",
};

const infoValue = {
  fontSize: "16px",
  fontWeight: "500",
  color: "#1f2937",
  marginTop: "0",
  marginBottom: "0",
};

const listItem = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#374151",
  marginBottom: "8px",
  marginLeft: "8px",
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
