import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface CfpSubmissionReceivedProps {
  speakerName: string;
  eventName: string;
  proposalTitle: string;
  eventUrl: string;
}

export const CfpSubmissionReceived = ({
  speakerName,
  eventName,
  proposalTitle,
  eventUrl,
}: CfpSubmissionReceivedProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your proposal for {eventName} has been received! 📝</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>Proposal Received! 📝</Heading>
            
            <Text style={paragraph}>Hi {speakerName},</Text>
            
            <Text style={paragraph}>
              Thank you for submitting your proposal to <strong>{eventName}</strong>!
            </Text>

            <Section style={infoBox}>
              <Text style={infoLabel}>Proposal Title:</Text>
              <Text style={infoValue}>{proposalTitle}</Text>
            </Section>

            <Text style={paragraph}>
              We&apos;ll carefully evaluate your proposal and get back to you with a decision.
            </Text>

            <Text style={paragraph}>
              <strong>What happens next?</strong>
            </Text>

            <Text style={listItem}>
              • Our team will review all submissions
            </Text>
            <Text style={listItem}>
              • You&apos;ll receive an email notification about the decision
            </Text>
            <Text style={listItem}>
              • If accepted, we&apos;ll provide next steps for your session
            </Text>

            <Section style={buttonContainer}>
              <Link style={button} href={eventUrl}>
                View Event Details
              </Link>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              Thank you for your interest in speaking at {eventName}! 
              We appreciate the time you took to submit your proposal.
            </Text>

            <Text style={footer}>
              If you have any questions, please don&apos;t hesitate to reach out 
              to the event organizer.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default CfpSubmissionReceived;

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

const buttonContainer = {
  marginTop: "32px",
  marginBottom: "32px",
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
