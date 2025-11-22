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

interface EventReminderEmailProps {
  attendeeName: string;
  eventName: string;
  eventDate: Date;
  eventEndDate?: Date;
  eventLocationType: "physical" | "virtual" | "hybrid";
  eventLocationAddress?: string;
  eventLocationUrl?: string;
  ticketNumber: string;
  ticketType: string;
  eventUrl: string;
  qrCodeDataUrl?: string;
  qrCodeCid?: string; // Content ID for inline image
  customMessage?: string;
}

export const EventReminderEmail = ({
  attendeeName,
  eventName,
  eventDate,
  eventEndDate,
  eventLocationType,
  eventLocationAddress,
  eventLocationUrl,
  ticketNumber,
  ticketType,
  eventUrl,
  qrCodeDataUrl,
  qrCodeCid,
  customMessage,
}: EventReminderEmailProps) => {
  // Calculate days until event
  const now = new Date();
  const eventDateObj = new Date(eventDate);
  const daysUntilEvent = Math.ceil(
    (eventDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Format dates
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

  // Determine location text
  const locationText =
    eventLocationType === "physical"
      ? "In-Person Event"
      : eventLocationType === "virtual"
        ? "Virtual Event"
        : "Hybrid Event";

  // Preview text
  const previewText =
    daysUntilEvent <= 0
      ? `${eventName} is today!`
      : daysUntilEvent === 1
        ? `${eventName} is tomorrow!`
        : `${eventName} is ${daysUntilEvent} days away!`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>
              {daysUntilEvent <= 0
                ? "Your Event is Today! 🎉"
                : daysUntilEvent === 1
                  ? "Your Event is Tomorrow! 🎉"
                  : "Event Reminder 🎉"}
            </Heading>

            <Text style={paragraph}>Hi {attendeeName},</Text>

            {daysUntilEvent <= 0 ? (
              <Text style={paragraph}>
                <strong>{eventName}</strong> is happening today! We&apos;re
                excited to see you there.
              </Text>
            ) : daysUntilEvent === 1 ? (
              <Text style={paragraph}>
                This is a friendly reminder that <strong>{eventName}</strong> is
                tomorrow! Get ready for an amazing experience.
              </Text>
            ) : (
              <Text style={paragraph}>
                This is a friendly reminder that <strong>{eventName}</strong> is
                coming up in <strong>{daysUntilEvent} days</strong>!
              </Text>
            )}

            {/* Custom Message from Organizer */}
            {customMessage && (
              <Section style={customMessageBox}>
                <Text style={customMessageTitle}>
                  Message from Event Organizer
                </Text>
                <Text style={customMessageText}>{customMessage}</Text>
              </Section>
            )}

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
                  Bring this QR code for check-in
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
                  {eventLocationUrl && (
                    <>
                      <br />
                      <a href={eventLocationUrl} style={linkStyle}>
                        Join Virtual Event
                      </a>
                    </>
                  )}
                </Text>
              </div>

              <div style={detailRow}>
                <Text style={detailLabel}>Your Ticket:</Text>
                <Text style={detailValue}>{ticketType}</Text>
              </div>

              <div style={detailRow}>
                <Text style={detailLabel}>Ticket Number:</Text>
                <Text style={ticketNumberValue}>{ticketNumber}</Text>
              </div>
            </Section>

            {/* Action Button */}
            <Button style={button} href={eventUrl}>
              View Event Details
            </Button>

            <Hr style={hr} />

            {/* Important Reminders */}
            <Section style={importantBox}>
              <Text style={importantTitle}>📌 Important Reminders</Text>
              <ul style={list}>
                <li style={listItem}>
                  <strong>Arrive early</strong> - We recommend arriving 15
                  minutes before the event starts for check-in
                </li>
                {qrCodeDataUrl && (
                  <li style={listItem}>
                    <strong>QR code ready</strong> - Have your QR code ready on
                    your phone or print this email
                  </li>
                )}
                {eventLocationType === "physical" && (
                  <li style={listItem}>
                    <strong>Valid ID</strong> - You may be asked to show
                    identification at check-in
                  </li>
                )}
                {eventLocationType === "virtual" && (
                  <li style={listItem}>
                    <strong>Test your setup</strong> - Ensure your internet
                    connection and audio/video are working properly
                  </li>
                )}
                <li style={listItem}>
                  <strong>Contact info</strong> - Save the organizer&apos;s
                  contact information in case you need assistance
                </li>
              </ul>
            </Section>

            {/* Footer */}
            <Text style={footer}>
              We can&apos;t wait to see you at {eventName}! If you have any
              questions or need assistance, please don&apos;t hesitate to reach
              out.
            </Text>

            <Text style={footer}>See you soon! 🚀</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default EventReminderEmail;

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

const customMessageBox = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "20px",
  marginTop: "24px",
  marginBottom: "24px",
  border: "1px solid #fde68a",
};

const customMessageTitle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#92400e",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  marginBottom: "12px",
  marginTop: "0",
};

const customMessageText = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#78350f",
  marginTop: "0",
  marginBottom: "0",
  whiteSpace: "pre-wrap" as const,
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

const infoLabel = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  marginBottom: "16px",
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

const linkStyle = {
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
  listStyleType: "disc" as const,
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
