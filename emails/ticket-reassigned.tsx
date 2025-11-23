import {
  Body,
  Button,
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

interface TicketReassignedEmailProps {
  attendeeName: string;
  eventName: string;
  eventDate: Date;
  eventLocation?: string;
  ticketNumber: string;
  ticketTypeName: string;
  qrCodeDataUrl: string;
  qrCodeCid?: string; // Content ID for inline image
  ticketUrl: string;
  buyerName?: string;
  buyerEmail?: string;
}

export const TicketReassignedEmail = ({
  attendeeName = "John Doe",
  eventName = "Tech Conference 2025",
  eventDate = new Date("2025-12-01T09:00:00Z"),
  eventLocation = "Convention Center, San Francisco",
  ticketNumber = "TKT-L8Z9K3-A7B2C5D8E9",
  ticketTypeName = "General Admission",
  qrCodeDataUrl = "data:image/png;base64,...",
  qrCodeCid,
  ticketUrl = "https://events-ting.com/tickets/TKT-L8Z9K3-A7B2C5D8E9",
  buyerName = "Jane Smith",
  buyerEmail = "jane@example.com",
}: TicketReassignedEmailProps) => {
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(eventDate);

  return (
    <Html>
      <Head />
      <Preview>
        Your ticket for {eventName} has been updated - {ticketNumber}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Heading style={h1}>Ticket Reassigned</Heading>

          {/* Greeting */}
          <Text style={text}>Hi {attendeeName},</Text>

          {/* Main Message */}
          <Text style={text}>
            You have been assigned a ticket for <strong>{eventName}</strong>.
            {buyerName && (
              <>
                {" "}
                This ticket was previously assigned to another attendee and has
                been reassigned to you by {buyerName}
                {buyerEmail && ` (${buyerEmail})`}.
              </>
            )}
          </Text>

          {/* Event Details */}
          <Section style={eventDetailsBox}>
            <Heading as="h2" style={h2}>
              Event Details
            </Heading>
            <Text style={eventDetail}>
              <strong>Event:</strong> {eventName}
            </Text>
            <Text style={eventDetail}>
              <strong>Date:</strong> {formattedDate}
            </Text>
            {eventLocation && (
              <Text style={eventDetail}>
                <strong>Location:</strong> {eventLocation}
              </Text>
            )}
            <Text style={eventDetail}>
              <strong>Ticket Type:</strong> {ticketTypeName}
            </Text>
            <Text style={eventDetail}>
              <strong>Ticket Number:</strong>{" "}
              <code style={ticketCode}>{ticketNumber}</code>
            </Text>
          </Section>

          {/* QR Code */}
          <Section style={qrSection}>
            <Heading as="h2" style={h2}>
              Your Ticket QR Code
            </Heading>
            <Text style={text}>
              Present this QR code at the event entrance for check-in:
            </Text>
            <div style={qrCodeContainer}>
              <img
                src={qrCodeCid ? `cid:${qrCodeCid}` : qrCodeDataUrl}
                alt="Ticket QR Code"
                style={qrCodeImage}
              />
            </div>
            <Text style={qrCodeCaption}>{ticketNumber}</Text>
          </Section>

          {/* CTA Button */}
          <Section style={buttonContainer}>
            <Button style={button} href={ticketUrl}>
              View Full Ticket
            </Button>
          </Section>

          {/* Important Information */}
          <Section style={infoBox}>
            <Heading as="h3" style={h3}>
              📋 Important Information
            </Heading>
            <ul style={bulletList}>
              <li style={bulletItem}>
                Save this email or download your ticket from the link above
              </li>
              <li style={bulletItem}>
                You can view your ticket anytime using the link above
              </li>
              <li style={bulletItem}>
                Present your QR code (digital or printed) at the event entrance
              </li>
              <li style={bulletItem}>
                If you have dietary restrictions or accessibility needs, please
                contact the organizer
              </li>
            </ul>
          </Section>

          {/* Privacy Notice */}
          <Section style={privacyBox}>
            <Text style={privacyText}>
              <strong>Privacy Notice:</strong> Your ticket was reassigned to you
              by the original buyer. The previous attendee&apos;s information
              has been permanently deleted in compliance with privacy
              regulations.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Text style={footer}>
            If you didn&apos;t expect this ticket or have questions, please
            contact the event organizer or reply to this email.
          </Text>
          <Text style={footer}>
            This is an automated message from Events-Ting. Please do not reply
            directly to this email.
          </Text>
          <Text style={footer}>
            <Link href="https://events-ting.com" style={link}>
              Events-Ting
            </Link>{" "}
            - Event Management Made Simple
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default TicketReassignedEmail;

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
  maxWidth: "600px",
};

const h1 = {
  color: "#1f2937",
  fontSize: "32px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0 40px",
  textAlign: "center" as const,
};

const h2 = {
  color: "#1f2937",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "20px 0 16px",
};

const h3 = {
  color: "#1f2937",
  fontSize: "18px",
  fontWeight: "600",
  margin: "16px 0 12px",
};

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 40px",
};

const eventDetailsBox = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  padding: "24px",
  margin: "32px 40px",
};

const eventDetail = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "8px 0",
};

const ticketCode = {
  backgroundColor: "#f3f4f6",
  padding: "2px 6px",
  borderRadius: "4px",
  fontFamily: "monospace",
  fontSize: "13px",
};

const qrSection = {
  margin: "32px 40px",
  textAlign: "center" as const,
};

const qrCodeContainer = {
  display: "flex",
  justifyContent: "center",
  margin: "24px 0",
};

const qrCodeImage = {
  width: "250px",
  height: "250px",
  border: "2px solid #e5e7eb",
  borderRadius: "8px",
};

const qrCodeCaption = {
  color: "#6b7280",
  fontSize: "12px",
  fontFamily: "monospace",
  marginTop: "8px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 28px",
};

const infoBox = {
  backgroundColor: "#eff6ff",
  borderLeft: "4px solid #2563eb",
  borderRadius: "4px",
  padding: "16px 24px",
  margin: "32px 40px",
};

const bulletList = {
  margin: "12px 0",
  paddingLeft: "20px",
};

const bulletItem = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "20px",
  marginBottom: "8px",
};

const privacyBox = {
  backgroundColor: "#fef3c7",
  borderLeft: "4px solid #f59e0b",
  borderRadius: "4px",
  padding: "16px 24px",
  margin: "32px 40px",
};

const privacyText = {
  color: "#92400e",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 40px",
};

const footer = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "8px 40px",
  textAlign: "center" as const,
};

const link = {
  color: "#2563eb",
  textDecoration: "underline",
};
