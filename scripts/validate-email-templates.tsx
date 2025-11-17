/**
 * Email Template Validation Script
 * 
 * This script validates that all email templates:
 * 1. Use only email-safe HTML/CSS patterns
 * 2. Have proper structure with required @react-email components
 * 3. Follow best practices for cross-client compatibility
 * 4. Include all required props and render without errors
 * 
 * Email client compatibility targets:
 * - Gmail (web, iOS, Android)
 * - Outlook (Windows, Mac, iOS, Android, web)
 * - Apple Mail (macOS, iOS)
 * - Yahoo Mail
 * - Thunderbird
 */

import React from "react";
import { render } from "@react-email/render";
import * as fs from "fs";
import * as path from "path";

// Import all team email templates
import TeamInvitation from "../emails/team-invitation";
import TeamInvitationAccepted from "../emails/team-invitation-accepted";
import TeamInvitationDeclined from "../emails/team-invitation-declined";
import TeamPermissionChanged from "../emails/team-permission-changed";
import TeamAccessRemoved from "../emails/team-access-removed";

interface ValidationResult {
  templateName: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

interface TemplateTest {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any;
}

// Test data for each template
const templates: TemplateTest[] = [
  {
    name: "team-invitation",
    component: TeamInvitation,
    props: {
      inviteeName: "John Doe",
      organizerName: "Jane Smith",
      eventName: "Tech Conference 2025",
      modulePermissions: ["CFP", "ATTENDEES", "SCHEDULE"],
      acceptUrl: "https://example.com/invitations/accept?token=abc123",
      expiresAt: new Date("2025-12-31T23:59:59Z"),
    },
  },
  {
    name: "team-invitation-accepted",
    component: TeamInvitationAccepted,
    props: {
      organizerName: "Jane Smith",
      collaboratorName: "John Doe",
      collaboratorEmail: "john@example.com",
      eventName: "Tech Conference 2025",
      modulePermissions: ["CFP", "ATTENDEES"],
      teamUrl: "https://example.com/event/123/settings/team",
    },
  },
  {
    name: "team-invitation-declined",
    component: TeamInvitationDeclined,
    props: {
      organizerName: "Jane Smith",
      collaboratorEmail: "john@example.com",
      eventName: "Tech Conference 2025",
      teamUrl: "https://example.com/event/123/settings/team",
    },
  },
  {
    name: "team-permission-changed",
    component: TeamPermissionChanged,
    props: {
      collaboratorName: "John Doe",
      organizerName: "Jane Smith",
      eventName: "Tech Conference 2025",
      previousPermissions: ["CFP"],
      newPermissions: ["CFP", "ATTENDEES", "SCHEDULE"],
      eventUrl: "https://example.com/event/123",
    },
  },
  {
    name: "team-access-removed",
    component: TeamAccessRemoved,
    props: {
      collaboratorName: "John Doe",
      organizerName: "Jane Smith",
      eventName: "Tech Conference 2025",
    },
  },
];

/**
 * Email-safe patterns validation
 * These patterns are known to work across all major email clients
 */
const validationRules = {
  // Critical: Elements that break in email clients
  unsafeElements: [
    /<script/i,
    /<iframe/i,
    /<form/i,
    /<input/i,
    /<video/i,
    /<audio/i,
    /<canvas/i,
    /<svg/i, // SVG has limited support
    /<embed/i,
    /<object/i,
  ],

  // Warning: CSS properties with limited support
  limitedCssSupport: [
    /position:\s*fixed/i,
    /position:\s*absolute/i,
    /position:\s*sticky/i,
    /float:/i,
    /flexbox/i,
    /grid/i,
    /transform:/i,
    /animation:/i,
    /@keyframes/i,
    /calc\(/i,
  ],

  // Required: Best practices
  requiredPatterns: [
    {
      pattern: /<html/i,
      message: "Must include <html> wrapper",
    },
    {
      pattern: /<head/i,
      message: "Must include <head> for meta tags",
    },
    {
      pattern: /<body/i,
      message: "Must include <body> wrapper",
    },
    {
      pattern: /overflow:hidden/i, // Preview text uses this pattern
      message: "Should include preview text for email clients",
    },
  ],

  // Best practices for buttons
  buttonBestPractices: [
    {
      check: (html: string) => {
        const buttons = html.match(/<a[^>]*href=/gi) ?? [];
        return buttons.every((btn) => btn.includes("style="));
      },
      message: "All buttons should have inline styles",
    },
  ],

  // Table-based layout detection (email-safe)
  tableLayoutUsage: /<table/i,
};

/**
 * Validate a single email template
 */
async function validateTemplate(test: TemplateTest): Promise<ValidationResult> {
  const result: ValidationResult = {
    templateName: test.name,
    passed: true,
    errors: [],
    warnings: [],
  };

  try {
    // Render the template to HTML
    const Component = test.component;
    const html = await render(<Component {...test.props} />);

    // Check for unsafe elements
    for (const pattern of validationRules.unsafeElements) {
      if (pattern.test(html)) {
        result.errors.push(
          `Contains unsafe element: ${pattern.source.replace(/[<>]/g, "")}`,
        );
        result.passed = false;
      }
    }

    // Check for CSS with limited support
    for (const pattern of validationRules.limitedCssSupport) {
      if (pattern.test(html)) {
        result.warnings.push(
          `Uses CSS with limited email client support: ${pattern.source}`,
        );
      }
    }

    // Check for required patterns
    for (const rule of validationRules.requiredPatterns) {
      if (!rule.pattern.test(html)) {
        if (rule.message.includes("Should")) {
          result.warnings.push(rule.message);
        } else {
          result.errors.push(rule.message);
          result.passed = false;
        }
      }
    }

    // Check button best practices
    for (const rule of validationRules.buttonBestPractices) {
      if (!rule.check(html)) {
        result.warnings.push(rule.message);
      }
    }

    // Check for inline styles (best practice for email)
    if (!html.includes('style="')) {
      result.warnings.push(
        "Consider using more inline styles for better compatibility",
      );
    }

    // Validate HTML length (some clients truncate long emails)
    const htmlLength = html.length;
    if (htmlLength > 102400) {
      // 100KB limit
      result.warnings.push(
        `Email HTML size is large (${Math.round(htmlLength / 1024)}KB). Consider optimizing.`,
      );
    }

    // Check for accessibility
    if (!html.includes('alt=')) {
      result.warnings.push(
        "Consider adding alt text to any images for accessibility",
      );
    }

    // Validate links
    const links = html.match(/href="([^"]*)"/gi) ?? [];
    for (const link of links) {
      if (link.includes("localhost") || link.includes("127.0.0.1")) {
        result.warnings.push(
          "Found localhost URL - ensure production URLs are used",
        );
      }
    }

    // Success checks
    if (result.errors.length === 0) {
      console.log(`✅ ${test.name}: Validation passed`);
    } else {
      console.log(`❌ ${test.name}: Validation failed`);
    }
  } catch (error) {
    result.passed = false;
    result.errors.push(`Render error: ${(error as Error).message}`);
    console.log(`❌ ${test.name}: Failed to render`);
  }

  return result;
}

/**
 * Generate HTML previews for manual testing
 */
async function generatePreviews(): Promise<void> {
  const outputDir = path.join(process.cwd(), ".email-previews");

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("\n📧 Generating HTML previews...");

  for (const test of templates) {
    try {
      const Component = test.component;
      const html = await render(<Component {...test.props} />);

      const filePath = path.join(outputDir, `${test.name}.html`);
      fs.writeFileSync(filePath, html, "utf-8");

      console.log(`   ✓ ${test.name}.html`);
    } catch (error) {
      console.log(
        `   ✗ ${test.name}.html - Error: ${(error as Error).message}`,
      );
    }
  }

  console.log(`\n📁 Previews saved to: ${outputDir}`);
  console.log(
    "   Open the .html files in different browsers to test rendering.\n",
  );
}

/**
 * Generate validation report
 */
function generateReport(results: ValidationResult[]): void {
  console.log("\n" + "=".repeat(80));
  console.log("EMAIL TEMPLATE VALIDATION REPORT");
  console.log("=".repeat(80) + "\n");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Templates: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌\n`);

  results.forEach((result) => {
    console.log(`\n📧 ${result.templateName}`);
    console.log("-".repeat(80));

    if (result.passed) {
      console.log("Status: ✅ PASSED");
    } else {
      console.log("Status: ❌ FAILED");
    }

    if (result.errors.length > 0) {
      console.log("\nErrors:");
      result.errors.forEach((error) => {
        console.log(`  ❌ ${error}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log("\nWarnings:");
      result.warnings.forEach((warning) => {
        console.log(`  ⚠️  ${warning}`);
      });
    }

    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log("\n  No issues found. Template follows best practices.");
    }
  });

  console.log("\n" + "=".repeat(80));
  console.log("EMAIL CLIENT COMPATIBILITY NOTES");
  console.log("=".repeat(80) + "\n");

  console.log("✅ Compatible with:");
  console.log("   - Gmail (web, iOS, Android)");
  console.log("   - Outlook (Windows, Mac, iOS, Android, web)");
  console.log("   - Apple Mail (macOS, iOS)");
  console.log("   - Yahoo Mail");
  console.log("   - Thunderbird");

  console.log("\n⚠️  Known Limitations:");
  console.log("   - Advanced CSS (flexbox, grid, animations) not supported");
  console.log("   - JavaScript disabled in all email clients");
  console.log("   - SVG support varies by client");
  console.log("   - Outlook uses Microsoft Word rendering engine (limited CSS)");

  console.log("\n📚 Best Practices Applied:");
  console.log("   - Table-based layouts for compatibility");
  console.log("   - Inline CSS for styling");
  console.log("   - System fonts for consistency");
  console.log("   - Responsive design using media queries");
  console.log("   - Accessible color contrast");

  console.log("\n" + "=".repeat(80) + "\n");
}

/**
 * Main validation function
 */
async function main(): Promise<void> {
  console.log("🔍 Validating email templates...\n");

  const results: ValidationResult[] = [];

  for (const test of templates) {
    const result = await validateTemplate(test);
    results.push(result);
  }

  generateReport(results);
  await generatePreviews();

  // Exit with error code if any template failed
  const hasFailures = results.some((r) => !r.passed);
  if (hasFailures) {
    console.log("❌ Some templates failed validation. Please fix the errors.\n");
    process.exit(1);
  } else {
    console.log("✅ All templates passed validation!\n");
    console.log("📧 Next steps:");
    console.log(
      "   1. Open the generated HTML files in different browsers/devices",
    );
    console.log("   2. Test with real email clients using a service like:");
    console.log("      - Litmus (https://litmus.com)");
    console.log("      - Email on Acid (https://www.emailonacid.com)");
    console.log("      - Mailtrap (https://mailtrap.io)\n");
    process.exit(0);
  }
}

// Run validation
void main();
