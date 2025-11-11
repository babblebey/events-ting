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
  recipientName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventUrl: string;
  daysUntilEvent: number;
}

export const EventReminderEmail = ({
  recipientName = "Attendee",
  eventName = "Next.js Conf 2025",
  eventDate = "October 24, 2025",
  eventTime = "9:00 AM PST",
  eventLocation = "San Francisco, CA",
  eventUrl = "https://example.com/events/nextjs-conf-2025",
  daysUntilEvent = 7,
}: EventReminderEmailProps) => {
  const previewText = `${eventName} is ${daysUntilEvent} ${daysUntilEvent === 1 ? "day" : "days"} away!`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Event Reminder</Heading>

          <Text style={text}>Hi {recipientName},</Text>

          <Text style={text}>
            This is a friendly reminder that <strong>{eventName}</strong> is
            coming up in{" "}
            <strong>
              {daysUntilEvent} {daysUntilEvent === 1 ? "day" : "days"}
            </strong>
            !
          </Text>

          <Section style={eventDetailsContainer}>
            <Heading as="h2" style={h2}>
              Event Details
            </Heading>

            <Text style={eventDetail}>
              <strong>Event:</strong> {eventName}
            </Text>

            <Text style={eventDetail}>
              <strong>Date:</strong> {eventDate}
            </Text>

            <Text style={eventDetail}>
              <strong>Time:</strong> {eventTime}
            </Text>

            <Text style={eventDetail}>
              <strong>Location:</strong> {eventLocation}
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={eventUrl}>
              View Event Details
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            We're looking forward to seeing you there! If you have any
            questions, please don't hesitate to reach out.
          </Text>

          <Text style={footer}>See you soon!</Text>
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

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "26px",
  padding: "0 40px",
};

const eventDetailsContainer = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "24px",
};

const eventDetail = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "8px 0",
};

const buttonContainer = {
  padding: "27px 0 27px",
  textAlign: "center" as const,
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  width: "auto",
  padding: "12px 32px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "42px 40px",
};

const footer = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "24px",
  padding: "0 40px",
};
