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

interface TicketAssignedProps {
  attendeeName: string;
  eventName: string;
  eventDate: Date;
  eventEndDate?: Date;
  eventLocationType: "physical" | "virtual" | "hybrid";
  eventLocationAddress?: string;
  ticketType: string;
  ticketNumber: string;
  ticketPrice: number;
  buyerName: string;
  buyerEmail: string;
  ticketUrl: string;
  qrCodeDataUrl?: string;
  qrCodeCid?: string; // Content ID for inline image (use when qrCodeDataUrl is sent as attachment)
  customData?: Record<string, unknown>;
}

export const TicketAssigned = ({
  attendeeName,
  eventName,
  eventDate,
  eventEndDate,
  eventLocationType,
  eventLocationAddress,
  ticketType,
  ticketNumber,
  ticketPrice,
  buyerName,
  buyerEmail,
  ticketUrl,
  qrCodeDataUrl,
  qrCodeCid,
  customData,
}: TicketAssignedProps) => {
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(eventDate));

  const formattedEndDate = eventEndDate
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
        timeStyle: "short",
      }).format(new Date(eventEndDate))
    : null;

  const priceDisplay =
    ticketPrice === 0 ? "FREE" : `$${ticketPrice.toFixed(2)}`;

  const locationText =
    eventLocationType === "physical"
      ? "In-Person Event"
      : eventLocationType === "virtual"
        ? "Virtual Event"
        : "Hybrid Event";

  return (
    <Html>
      <Head />
      <Preview>Your ticket for {eventName} is ready! 🎟️</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>Your Ticket is Ready! 🎟️</Heading>

            <Text style={paragraph}>Hi {attendeeName},</Text>

            <Text style={paragraph}>
              Great news! You&apos;ve been assigned a ticket for{" "}
              <strong>{eventName}</strong>. Your ticket details and QR code are
              ready.
            </Text>

            {/* QR Code */}
            {(qrCodeDataUrl ?? qrCodeCid) && (
              <Section style={qrCodeSection}>
                <img
                  src={qrCodeCid ? `cid:${qrCodeCid}` : qrCodeDataUrl}
                  alt="Ticket QR Code"
                  width="200"
                  height="200"
                  style={qrCodeImage}
                />
                <Text style={qrCodeCaption}>
                  Show this QR code at event check-in
                </Text>
              </Section>
            )}

            {/* Event Details Box */}
            <Section style={infoBox}>
              <Text style={infoLabel}>Event Details</Text>

              <div style={detailRow}>
                <Text style={detailLabel}>Event:</Text>
                <Text style={detailValue}>{eventName}</Text>
              </div>

              <div style={detailRow}>
                <Text style={detailLabel}>Date:</Text>
                <Text style={detailValue}>{formattedDate}</Text>
              </div>

              {formattedEndDate && (
                <div style={detailRow}>
                  <Text style={detailLabel}>Ends:</Text>
                  <Text style={detailValue}>{formattedEndDate}</Text>
                </div>
              )}

              <div style={detailRow}>
                <Text style={detailLabel}>Location:</Text>
                <Text style={detailValue}>
                  {locationText}
                  {eventLocationAddress && (
                    <>
                      <br />
                      {eventLocationAddress}
                    </>
                  )}
                </Text>
              </div>

              <div style={detailRow}>
                <Text style={detailLabel}>Ticket Type:</Text>
                <Text style={detailValue}>{ticketType}</Text>
              </div>

              <div style={detailRow}>
                <Text style={detailLabel}>Price:</Text>
                <Text style={priceValue}>{priceDisplay}</Text>
              </div>

              <div style={detailRow}>
                <Text style={detailLabel}>Ticket Number:</Text>
                <Text style={ticketNumberValue}>{ticketNumber}</Text>
              </div>
            </Section>

            {/* Custom Registration Data */}
            {customData && Object.keys(customData).length > 0 && (
              <Section style={customDataBox}>
                <Text style={infoLabel}>Your Information</Text>
                {Object.entries(customData).map(([key, value]) => (
                  <div key={key} style={detailRow}>
                    <Text style={detailLabel}>
                      {key.replace(/([A-Z])/g, " $1").trim()}:
                    </Text>
                    <Text style={detailValue}>{String(value)}</Text>
                  </div>
                ))}
              </Section>
            )}

            {/* Purchased By */}
            <Section style={buyerBox}>
              <Text style={buyerLabel}>Purchased By</Text>
              <Text style={buyerValue}>
                {buyerName}
                <br />
                <Link href={`mailto:${buyerEmail}`} style={emailLink}>
                  {buyerEmail}
                </Link>
              </Text>
            </Section>

            {/* Action Button */}
            <Button style={button} href={ticketUrl}>
              View Full Ticket Details
            </Button>

            <Hr style={hr} />

            {/* Important Information */}
            <Section style={importantBox}>
              <Text style={importantTitle}>📌 Important Information</Text>
              <ul style={list}>
                <li style={listItem}>
                  <strong>Save this email</strong> - You&apos;ll need it for
                  check-in
                </li>
                <li style={listItem}>
                  <strong>Arrive early</strong> - We recommend arriving 15
                  minutes before the event starts
                </li>
                <li style={listItem}>
                  <strong>QR code ready</strong> - Have your QR code ready on
                  your phone or printed
                </li>
                <li style={listItem}>
                  <strong>Valid ID</strong> - You may be asked to show
                  identification at check-in
                </li>
              </ul>
            </Section>

            {/* Need Help */}
            <Text style={footer}>
              Questions about your ticket? Contact the buyer at{" "}
              <Link href={`mailto:${buyerEmail}`} style={emailLink}>
                {buyerEmail}
              </Link>{" "}
              or reach out to the event organizer.
            </Text>

            <Text style={footer}>See you at the event! 🚀</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default TicketAssigned;

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

const qrCodeSection = {
  textAlign: "center" as const,
  padding: "24px",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  border: "2px solid #e5e7eb",
  marginTop: "24px",
  marginBottom: "24px",
};

const qrCodeImage = {
  margin: "0 auto",
  display: "block",
};

const qrCodeCaption = {
  fontSize: "14px",
  color: "#6b7280",
  marginTop: "12px",
  marginBottom: "0",
  textAlign: "center" as const,
};

const infoBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "24px",
  marginTop: "24px",
  marginBottom: "24px",
};

const customDataBox = {
  backgroundColor: "#eff6ff",
  borderRadius: "8px",
  padding: "24px",
  marginBottom: "24px",
  border: "1px solid #dbeafe",
};

const buyerBox = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "24px",
  border: "1px solid #fde68a",
};

const infoLabel = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  marginBottom: "16px",
  marginTop: "0",
};

const buyerLabel = {
  fontSize: "11px",
  fontWeight: "600",
  color: "#92400e",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  marginBottom: "8px",
  marginTop: "0",
};

const detailRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "12px",
};

const detailLabel = {
  fontSize: "14px",
  color: "#6b7280",
  marginTop: "0",
  marginBottom: "0",
  flex: "0 0 auto",
  marginRight: "16px",
};

const detailValue = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#1f2937",
  marginTop: "0",
  marginBottom: "0",
  textAlign: "right" as const,
  flex: "1",
};

const priceValue = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#2563eb",
  marginTop: "0",
  marginBottom: "0",
  textAlign: "right" as const,
  flex: "1",
};

const ticketNumberValue = {
  fontSize: "14px",
  fontWeight: "700",
  color: "#1f2937",
  fontFamily: "monospace",
  marginTop: "0",
  marginBottom: "0",
  textAlign: "right" as const,
  flex: "1",
  letterSpacing: "1px",
};

const buyerValue = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#92400e",
  marginTop: "0",
  marginBottom: "0",
};

const emailLink = {
  color: "#2563eb",
  textDecoration: "underline",
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

const importantBox = {
  backgroundColor: "#fef9f3",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "24px",
  border: "1px solid #fed7aa",
};

const importantTitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#92400e",
  marginTop: "0",
  marginBottom: "12px",
};

const list = {
  margin: "0",
  padding: "0 0 0 20px",
  listStyleType: "none" as const,
};

const listItem = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#78350f",
  marginBottom: "8px",
};

const footer = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "1.5",
  marginBottom: "8px",
};
