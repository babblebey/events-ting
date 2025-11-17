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

interface TeamPermissionChangedProps {
  collaboratorName: string;
  organizerName: string;
  eventName: string;
  previousPermissions: string[];
  newPermissions: string[];
  eventUrl: string;
}

export const TeamPermissionChanged = ({
  collaboratorName,
  organizerName,
  eventName,
  previousPermissions,
  newPermissions,
  eventUrl,
}: TeamPermissionChangedProps) => {
  const addedPermissions = newPermissions.filter(
    (p) => !previousPermissions.includes(p),
  );
  const removedPermissions = previousPermissions.filter(
    (p) => !newPermissions.includes(p),
  );

  return (
    <Html>
      <Head />
      <Preview>Your permissions have been updated for {eventName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>Permissions Updated 🔄</Heading>

            <Text style={paragraph}>Hi {collaboratorName},</Text>

            <Text style={paragraph}>
              <strong>{organizerName}</strong> has updated your access
              permissions for <strong>{eventName}</strong>.
            </Text>

            {addedPermissions.length > 0 && (
              <Section style={infoBox}>
                <Text style={addedLabel}>✓ Added Access:</Text>
                {addedPermissions.map((module) => (
                  <Text key={module} style={moduleItem}>
                    + {module}
                  </Text>
                ))}
              </Section>
            )}

            {removedPermissions.length > 0 && (
              <Section style={removedBox}>
                <Text style={removedLabel}>✗ Removed Access:</Text>
                {removedPermissions.map((module) => (
                  <Text key={module} style={removedModuleItem}>
                    - {module}
                  </Text>
                ))}
              </Section>
            )}

            <Section style={infoBox}>
              <Text style={infoLabel}>Your Current Access:</Text>
              {newPermissions.map((module) => (
                <Text key={module} style={moduleItem}>
                  ✓ {module}
                </Text>
              ))}
            </Section>

            <Text style={paragraph}>
              These changes are effective immediately. You can now access your
              updated modules.
            </Text>

            <Button style={button} href={eventUrl}>
              Go to Event Dashboard
            </Button>

            <Hr style={hr} />

            <Text style={footer}>
              If you have any questions about these changes, please contact the
              event organizer.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default TeamPermissionChanged;

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

const removedBox = {
  backgroundColor: "#fef2f2",
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
  marginBottom: "12px",
  marginTop: "0",
};

const addedLabel = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#059669",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  marginBottom: "12px",
  marginTop: "0",
};

const removedLabel = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#dc2626",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  marginBottom: "12px",
  marginTop: "0",
};

const moduleItem = {
  fontSize: "16px",
  fontWeight: "500",
  color: "#1f2937",
  marginTop: "0",
  marginBottom: "8px",
};

const removedModuleItem = {
  fontSize: "16px",
  fontWeight: "500",
  color: "#991b1b",
  marginTop: "0",
  marginBottom: "8px",
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
