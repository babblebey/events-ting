# Email Template Testing Guide

This guide covers how to validate and test email templates in the events-ting application to ensure they render correctly across all major email clients.

## Overview

Email rendering is notoriously inconsistent across different email clients. This project includes automated validation tools and guidelines to ensure our email templates work reliably across:

- Gmail (web, iOS, Android)
- Outlook (Windows, Mac, iOS, Android, web)
- Apple Mail (macOS, iOS)
- Yahoo Mail
- Thunderbird

## Quick Start

### Validate All Templates

Run the automated validation script:

```bash
pnpm exec tsx scripts/validate-email-templates.tsx
```

This will:
1. Render all email templates to HTML
2. Check for email-safe patterns and best practices
3. Generate HTML preview files in `.email-previews/`
4. Provide a detailed validation report

### View HTML Previews

After validation, open the generated HTML files in different browsers:

```bash
# Preview files are located in:
.email-previews/
  team-invitation.html
  team-invitation-accepted.html
  team-invitation-declined.html
  team-permission-changed.html
  team-access-removed.html
```

Open these files in:
- Chrome/Edge (simulates WebKit-based email clients)
- Firefox (simulates Gecko-based email clients)
- Safari (simulates Apple Mail rendering)

## Email Templates

### Team Collaboration Emails

1. **team-invitation.tsx** - Sent when a collaborator is invited
   - Shows event name, organizer name, and module permissions
   - Includes acceptance link with expiration date
   - Preview text optimized for inbox view

2. **team-invitation-accepted.tsx** - Sent to organizer when invitation is accepted
   - Confirms collaborator details and permissions
   - Provides link to team management page

3. **team-invitation-declined.tsx** - Sent to organizer when invitation is declined
   - Notifies organizer of the decline
   - Encourages direct communication if needed

4. **team-permission-changed.tsx** - Sent when permissions are modified
   - Shows added and removed permissions with visual distinction
   - Lists current permissions
   - Links to event dashboard

5. **team-access-removed.tsx** - Sent when access is revoked
   - Professional notification of access removal
   - Encourages direct communication for questions

## Validation Checks

### Critical Checks (Must Pass)

✅ **Email-Safe HTML Structure**
- Proper DOCTYPE declaration
- Valid `<html>`, `<head>`, and `<body>` tags
- No unsafe elements (script, iframe, form, video, etc.)

✅ **Table-Based Layout**
- Uses table elements for layout (most compatible)
- Avoids flexbox, grid, and float-based layouts

✅ **Inline CSS**
- All styling uses inline styles or style attributes
- No external stylesheets (not supported in email)

### Best Practice Warnings

⚠️ **Limited CSS Support**
- Avoid transform, animation, position properties
- Use basic CSS properties only

⚠️ **Button Styling**
- All buttons should have inline styles
- Use `<a>` tags with button-like styling (not `<button>`)

⚠️ **Accessibility**
- Include alt text for images
- Use semantic HTML where possible
- Ensure sufficient color contrast

⚠️ **Preview Text**
- Include preview text that appears in inbox view
- Keep it concise and relevant (40-130 characters)

## Email Client Limitations

### Outlook (Windows)

- Uses Microsoft Word rendering engine
- Limited CSS support
- Best to test with Outlook-specific tools

**Workarounds:**
- Use VML for buttons and rounded corners
- Avoid padding on table cells (use nested tables)
- Test with Outlook-specific conditional comments

### Gmail

- Strips CSS from `<style>` tags on mobile
- Converts some attributes automatically
- Caches images aggressively

**Workarounds:**
- Use inline styles exclusively
- Include `display:block` for images
- Use full URLs for all resources

### Apple Mail

- Generally has the best CSS support
- Renders HTML email like a web page
- Supports some modern CSS features

**Considerations:**
- Test on both macOS and iOS versions
- Check dark mode compatibility
- Verify media queries work as expected

### Dark Mode Support

Some email clients (Apple Mail, Outlook, Gmail) support dark mode:

```css
/* Example dark mode styles */
@media (prefers-color-scheme: dark) {
  .body { background-color: #000000 !important; }
  .text { color: #ffffff !important; }
}
```

Our templates use neutral colors that work in both light and dark modes.

## Testing Workflow

### 1. Local Validation (Automated)

```bash
# Run validation script
pnpm exec tsx scripts/validate-email-templates.tsx

# Check for errors and warnings
# Fix any critical issues before proceeding
```

### 2. Browser Preview (Manual)

```bash
# Open preview files in multiple browsers
open .email-previews/team-invitation.html
```

Check for:
- Layout consistency
- Text readability
- Button clickability
- Responsive behavior (resize browser)

### 3. Real Email Client Testing (Recommended)

Use a professional email testing service:

#### Option A: Litmus (Paid)
- https://litmus.com
- Tests across 100+ email clients
- Provides screenshots and code analysis
- Collaborative review features

#### Option B: Email on Acid (Paid)
- https://www.emailonacid.com
- Similar to Litmus
- Includes spam testing

#### Option C: Mailtrap (Free Tier Available)
- https://mailtrap.io
- Email sandbox for development
- HTML/CSS validation
- Spam score analysis
- Free tier for testing

#### Option D: Manual Testing (Free)
1. Set up free email accounts:
   - Gmail: gmail.com
   - Outlook: outlook.com
   - Yahoo Mail: mail.yahoo.com
   - ProtonMail: proton.me

2. Send test emails using Resend development mode:
   ```typescript
   // In development, emails are not sent
   // Check logs or Resend dashboard for previews
   ```

3. Check rendering in each client:
   - Web version
   - Mobile app (if available)
   - Desktop client (if applicable)

### 4. Accessibility Testing

```bash
# Use browser accessibility tools
# Chrome DevTools > Lighthouse > Accessibility

# Or use online validators
# https://wave.webaim.org/
```

Check for:
- Sufficient color contrast (WCAG AA standard)
- Semantic HTML structure
- Alt text for images
- Screen reader compatibility

## Common Issues and Solutions

### Issue: Images Not Displaying

**Cause:** Relative URLs or blocked external images

**Solution:**
```tsx
// Use absolute URLs
<img src="https://yourdomain.com/images/logo.png" alt="Logo" />

// Include width and height
<img 
  src="https://yourdomain.com/images/logo.png" 
  alt="Logo"
  width="200"
  height="50"
  style="display:block"
/>
```

### Issue: Buttons Look Different in Outlook

**Cause:** Outlook doesn't support border-radius, some padding

**Solution:**
```tsx
// Use VML for Outlook
<a href="..." style="...">
  <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" ...>
    <v:textbox style="...">
  <![endif]-->
  Button Text
  <!--[if mso]>
    </v:textbox>
    </v:roundrect>
  <![endif]-->
</a>
```

Our templates use @react-email components which handle this automatically.

### Issue: Spacing Issues in Gmail Mobile

**Cause:** Gmail strips CSS from `<style>` tags

**Solution:**
```tsx
// Use inline styles only
<div style="padding: 20px; margin-bottom: 16px;">
  Content
</div>

// Avoid CSS classes
// ❌ <div className="container">
// ✅ <div style="...">
```

### Issue: Fonts Not Rendering Correctly

**Cause:** Custom web fonts often blocked by email clients

**Solution:**
```tsx
// Use web-safe font stacks
const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif';

<p style={{ fontFamily }}>Text</p>
```

## Best Practices Summary

### ✅ Do

- Use table-based layouts
- Write inline CSS
- Use web-safe fonts
- Include alt text for images
- Test in multiple clients
- Use absolute URLs
- Keep HTML under 102KB
- Include preview text
- Use semantic HTML
- Ensure good color contrast

### ❌ Don't

- Use JavaScript
- Use external stylesheets
- Use flexbox or grid
- Use CSS animations
- Use position: absolute/fixed
- Use forms or form elements
- Rely on hover states
- Use custom web fonts
- Use background images (limited support)
- Use SVG (limited support)

## React Email Components

We use @react-email/components for better compatibility:

```tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components";

// These components render email-safe HTML
// with proper fallbacks for different clients
```

### Component Benefits

1. **Automatic Fallbacks** - Components include Outlook-specific VML code
2. **Consistent Styling** - Inline styles applied automatically
3. **Best Practices** - Follows email HTML conventions
4. **Type Safety** - TypeScript support for props

## Continuous Integration

### Pre-commit Validation

Add email validation to your git hooks:

```bash
# .husky/pre-commit
#!/bin/sh
pnpm exec tsx scripts/validate-email-templates.tsx
```

### CI/CD Pipeline

Add validation to your GitHub Actions workflow:

```yaml
# .github/workflows/ci.yml
- name: Validate Email Templates
  run: pnpm exec tsx scripts/validate-email-templates.tsx
```

## Resources

### Documentation
- [React Email Docs](https://react.email/docs/introduction)
- [Email Client CSS Support](https://www.caniemail.com/)
- [HTML Email Best Practices](https://www.campaignmonitor.com/dev-resources/guides/coding/)

### Testing Tools
- [Litmus](https://litmus.com) - Professional email testing
- [Email on Acid](https://www.emailonacid.com) - Email testing platform
- [Mailtrap](https://mailtrap.io) - Email sandbox
- [Can I email](https://www.caniemail.com/) - Email client compatibility

### Learning Resources
- [Really Good Emails](https://reallygoodemails.com/) - Email design inspiration
- [Email Design Reference](https://templates.mailchimp.com/) - Mailchimp templates
- [Cerberus](https://github.com/TedGoas/Cerberus) - Responsive email patterns

## Troubleshooting

### Validation Script Errors

**Error: "React is not defined"**
```bash
# Ensure React is imported in the validation script
import React from "react";
```

**Error: "Cannot find module"**
```bash
# Ensure all email template files are properly exported
export default TemplateName;
```

### Rendering Issues

**Problem: Template renders but looks wrong**
1. Check inline styles are applied
2. Verify table structure is correct
3. Test in different email clients
4. Compare with preview HTML file

**Problem: Validation passes but real emails fail**
1. Test with actual email service (Resend)
2. Check for image loading issues
3. Verify URLs are absolute
4. Test with real email client, not just browser

## Support

For issues with email templates:
1. Check this documentation first
2. Review the validation script output
3. Test in multiple email clients
4. Consult React Email documentation
5. Open an issue in the project repository

---

**Last Updated:** 2025-11-17  
**Version:** 1.0.0
