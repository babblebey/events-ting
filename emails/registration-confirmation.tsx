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

interface RegistrationConfirmationProps {
  attendeeName: string;
  eventName: string;
  eventDate: Date;
  ticketType: string;
  registrationCode: string;
  eventUrl: string;
  ticketCount?: number;
  manageTicketsUrl?: string;
}

export const RegistrationConfirmation = ({
  attendeeName,
  eventName,
  eventDate,
  ticketType,
  registrationCode,
  eventUrl,
  ticketCount = 1,
  manageTicketsUrl,
}: RegistrationConfirmationProps) => {
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(eventDate));

  const hasMultipleTickets = ticketCount > 1;

  return (
    <Html>
      <Head />
      <Preview>You&apos;re registered for {eventName}! 🎉</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>Registration Confirmed! 🎉</Heading>

            <Text style={paragraph}>Hi {attendeeName},</Text>

            <Text style={paragraph}>
              Great news! You&apos;re all set for <strong>{eventName}</strong>.
            </Text>

            <Section style={infoBox}>
              <Text style={infoLabel}>Event:</Text>
              <Text style={infoValue}>{eventName}</Text>

              <Text style={infoLabel}>Date:</Text>
              <Text style={infoValue}>{formattedDate}</Text>

              <Text style={infoLabel}>Ticket Type:</Text>
              <Text style={infoValue}>{ticketType}</Text>

              <Text style={infoLabel}>Registration Code:</Text>
              <Text style={codeValue}>{registrationCode}</Text>

              {hasMultipleTickets && (
                <>
                  <Text style={infoLabel}>Tickets Purchased:</Text>
                  <Text style={infoValue}>{ticketCount}</Text>
                </>
              )}
            </Section>

            {/* Ticket Assignment Notice */}
            {hasMultipleTickets && manageTicketsUrl && (
              <Section style={ticketNoticeBox}>
                <Text style={ticketNoticeTitle}>
                  📋 Next Step: Assign Your Tickets
                </Text>
                <Text style={ticketNoticeText}>
                  You purchased {ticketCount} tickets. Please assign each ticket
                  to an attendee (including yourself) so they can receive their
                  individual ticket with QR code.
                </Text>
                <Button style={manageButton} href={manageTicketsUrl}>
                  Manage Your Tickets
                </Button>
                <Text style={ticketNoticeHelp}>
                  Each attendee will receive their own ticket via email with a
                  unique QR code for check-in.
                </Text>
              </Section>
            )}

            {!hasMultipleTickets && (
              <Text style={paragraph}>
                Keep this email handy! You may need your registration code for
                check-in.
              </Text>
            )}

            <Button style={button} href={eventUrl}>
              View Event Details
            </Button>

            <Hr style={hr} />

            <Text style={footer}>
              If you have any questions, please don&apos;t hesitate to reach out
              to the event organizer.
            </Text>

            <Text style={footer}>See you at the event! 🚀</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default RegistrationConfirmation;

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
  marginTop: "16px",
};

const infoValue = {
  fontSize: "16px",
  fontWeight: "500",
  color: "#1f2937",
  marginTop: "0",
  marginBottom: "0",
};

const codeValue = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#2563eb",
  fontFamily: "monospace",
  marginTop: "0",
  marginBottom: "0",
  letterSpacing: "2px",
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

const ticketNoticeBox = {
  backgroundColor: "#eff6ff",
  borderRadius: "8px",
  padding: "24px",
  marginTop: "24px",
  marginBottom: "24px",
  border: "2px solid #3b82f6",
};

const ticketNoticeTitle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1e40af",
  marginTop: "0",
  marginBottom: "12px",
};

const ticketNoticeText = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#1e40af",
  marginBottom: "16px",
  marginTop: "0",
};

const ticketNoticeHelp = {
  fontSize: "13px",
  lineHeight: "1.5",
  color: "#3b82f6",
  marginTop: "12px",
  marginBottom: "0",
  fontStyle: "italic" as const,
};

const manageButton = {
  backgroundColor: "#3b82f6",
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

const footer = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "1.5",
  marginBottom: "8px",
};
