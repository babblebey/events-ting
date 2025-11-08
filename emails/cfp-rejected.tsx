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

interface CfpRejectedProps {
  speakerName: string;
  eventName: string;
  proposalTitle: string;
  reviewNotes?: string;
  eventUrl: string;
}

export const CfpRejected = ({
  speakerName,
  eventName,
  proposalTitle,
  reviewNotes,
  eventUrl,
}: CfpRejectedProps) => {
  return (
    <Html>
      <Head />
      <Preview>Update on your proposal for {eventName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>Proposal Update</Heading>
            
            <Text style={paragraph}>Hi {speakerName},</Text>
            
            <Text style={paragraph}>
              Thank you for submitting your proposal to <strong>{eventName}</strong>. 
              We appreciate the time and effort you put into your submission.
            </Text>

            <Section style={infoBox}>
              <Text style={infoLabel}>Proposal Title:</Text>
              <Text style={infoValue}>{proposalTitle}</Text>
            </Section>

            <Text style={paragraph}>
              After careful consideration, we&apos;ve decided not to move forward 
              with your proposal for this event. This was a difficult decision as 
              we received many high-quality submissions.
            </Text>

            {reviewNotes && (
              <Section style={feedbackBox}>
                <Text style={feedbackLabel}>Reviewer Feedback:</Text>
                <Text style={feedbackText}>{reviewNotes}</Text>
              </Section>
            )}

            <Text style={paragraph}>
              We encourage you to:
            </Text>

            <Text style={listItem}>
              • Consider submitting to future events
            </Text>
            <Text style={listItem}>
              • Use any feedback to refine your proposal
            </Text>
            <Text style={listItem}>
              • Stay connected with our community
            </Text>

            <Section style={buttonContainer}>
              <Link style={button} href={eventUrl}>
                View Event Details
              </Link>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              Thank you again for your interest in {eventName}. We hope to see 
              your submissions at future events!
            </Text>

            <Text style={footer}>
              Best regards,<br />
              The {eventName} Team
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default CfpRejected;

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

const feedbackBox = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  border: "1px solid #fbbf24",
  padding: "24px",
  marginTop: "24px",
  marginBottom: "24px",
};

const feedbackLabel = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#92400e",
  marginBottom: "8px",
  marginTop: "0",
};

const feedbackText = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#78350f",
  marginTop: "0",
  marginBottom: "0",
  whiteSpace: "pre-wrap" as const,
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
  backgroundColor: "#6b7280",
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
