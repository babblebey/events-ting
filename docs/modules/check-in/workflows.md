# Check-In Workflows

## Overview

This document provides step-by-step workflows for all check-in scenarios, including manual check-in, QR code scanning, Quick Mode operations, and error handling.

---

## Workflow 1: Manual Check-In (Dashboard Mode)

**Use Case**: Team member checks in an attendee by searching for their ticket number.

**Prerequisites**:
- User is logged in
- User has CHECKIN permission for the event
- User is on the check-in page in Dashboard Mode

### Steps

#### 1. Navigate to Check-In Page

1. Open event dashboard
2. Click "Check-In" in navigation menu
3. URL: `/events/[event-slug]/check-in`
4. Dashboard Mode loads by default

**System Actions**:
- Server checks authentication
- Verifies CHECKIN permission
- Pre-fetches attendee list and metrics
- Renders page with initial data

#### 2. Search for Attendee (Optional)

1. Locate search input at top of table
2. Type ticket number (e.g., "TKT-2025-ABC123")
3. System debounces input (500ms delay)
4. Results update automatically

**System Actions**:
- Waits 500ms after last keystroke
- Updates URL with search parameter: `?search=TKT-2025-ABC123`
- Sends API request: `checkIn.listAttendees({ search: "TKT-2025-ABC123" })`
- Filters table to matching attendees
- Resets pagination to page 1

**Expected Results**:
- Table shows only matching tickets
- If no matches: "No attendees found" message
- If matches: Filtered list displayed

#### 3. Filter by Status (Optional)

1. Click filter dropdown
2. Select "Not Checked In"
3. Table updates to show only unchecked attendees

**System Actions**:
- Updates URL: `?filter=notCheckedIn`
- Sends API request with filter
- Table re-renders with filtered data
- Resets pagination to page 1

#### 4. Locate Attendee in Table

1. Scan table visually or use search
2. Find matching row by ticket number or name
3. Verify attendee details (name, email)

**Table Columns**:
- Ticket Number (mono font)
- Attendee Name (shows buyer if no attendee assigned)
- Email
- Status (Badge: "Checked In" or "Not Checked In")
- Checked In At (timestamp or empty)
- Actions (Check In button)

#### 5. Verify Attendee Details

1. Check attendee name matches
2. If "Buyer: [Name]" appears below name, ticket was purchased by someone else
3. Verify email if needed
4. Confirm ticket number matches

**Visual Indicators**:
- Green "Checked In" badge = Already checked in
- Gray "Not Checked In" badge = Ready to check in
- Buyer name in gray text = Different from attendee

#### 6. Click "Check In" Button

1. Locate "Check In" button in Actions column
2. Click button
3. Button immediately shows loading spinner

**System Actions**:
- **Optimistic Update**: Button changes to loading state immediately
- **Optimistic Update**: Badge changes to "Checked In" (green)
- **Optimistic Update**: Timestamp appears (current time)
- Mutation sent to server: `checkIn.checkIn({ eventId, ticketNumber })`
- Server validates ticket
- Server updates database: `isCheckedIn = true`, `checkedInAt = NOW()`, `checkedInBy = userId`

#### 7. Confirmation and Metrics Update

**Success Path**:
- Toast notification: "Checked in successfully!"
- Button changes to "Already Checked In" (disabled, gray)
- Timestamp displays check-in time in event timezone
- Metrics refresh automatically (10-second interval or immediate invalidation)
- Recent check-ins feed updates

**Already Checked In Path**:
- Toast notification: "Attendee was already checked in"
- No error thrown (idempotent operation)
- Existing check-in timestamp preserved
- `alreadyCheckedIn: true` in response

**Error Path**:
- **Optimistic Rollback**: Badge reverts to "Not Checked In"
- **Optimistic Rollback**: Timestamp removed
- **Optimistic Rollback**: Button returns to "Check In"
- Toast notification with error message (e.g., "Ticket not found")
- User can retry

#### 8. Continue to Next Attendee

1. Metrics update shows new count
2. Table auto-refreshes every 10 seconds
3. Team member ready for next check-in
4. Repeat from step 2

**System State**:
- Checked-in attendee moves to "Checked In" filter
- Total checked-in count increments
- Progress percentage updates
- Recent check-ins feed shows new entry

---

## Workflow 2: QR Code Scanning (Dashboard Mode)

**Use Case**: Team member scans attendee's QR code for fast check-in.

**Prerequisites**:
- User is on check-in page in Dashboard Mode
- Device has camera
- Browser has camera permission (or will request)

### Steps

#### 1. Open QR Scanner

1. Click "Scan QR Code" button (usually at top of page)
2. Modal dialog opens
3. Camera initializes

**System Actions**:
- `QRCodeScannerModal` component mounts
- Camera permission requested (if first time)
- `html5-qrcode` library initializes
- Camera feed starts in modal

**Camera Permission Flow**:
- **First Time**: Browser shows permission prompt
  - User clicks "Allow" → Scanner starts
  - User clicks "Deny" → Error message shows
- **Subsequent Times**: Permission remembered, scanner starts immediately

#### 2. Position QR Code

1. Attendee presents ticket (physical or digital)
2. Team member holds device camera over QR code
3. QR code should fill scanning box (250x250px)
4. Hold steady for 1-2 seconds

**Visual Feedback**:
- Green scanning box visible
- Camera feed shows in real-time
- Scanner actively detecting patterns

**Tips**:
- Distance: 6-12 inches from QR code
- Lighting: Ensure adequate brightness
- Focus: Hold camera still briefly
- Orientation: QR code should be upright

#### 3. Automatic QR Detection

**System Actions** (automatic, <2 seconds):
- `html5-qrcode` library detects QR code
- Decodes QR data string
- Calls `onScan(decodedText)` callback
- Modal auto-closes
- QR data passed to handler

**QR Data Examples**:
- Simple: `"TKT-2025-ABC123"`
- JSON: `'{"ticketNumber":"TKT-2025-ABC123","eventId":"..."}'`
- Future JWT: `"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`

#### 4. QR Code Parsing

**System Actions**:
```typescript
// parseQRCode utility processes data
const ticketNumber = parseQRCode(qrCodeData);

// Supported formats:
// 1. Direct ticket number: "TKT-2025-ABC123"
// 2. JSON with ticketNumber field
// 3. JWT with ticket in payload (future)
```

**Error Handling**:
- Invalid format → Error toast: "Invalid QR code format"
- Missing ticket number → Error toast: "QR code missing ticket number"
- Corrupted data → Error toast: "Could not read QR code"

#### 5. Fetch Ticket Details

**System Actions**:
- Mutation called: `checkIn.getTicketDetails({ eventId, ticketNumber })`
- Server looks up ticket in database
- Returns ticket with attendee/buyer info and check-in status

**Success Response**:
```typescript
{
  ticket: {
    id: "...",
    ticketNumber: "TKT-2025-ABC123",
    isCheckedIn: false,
    checkedInAt: null,
    attendee: { name: "John Doe", email: "john@example.com" },
    registration: { name: "Jane Doe", email: "jane@example.com" }
  },
  eventTimezone: "America/New_York"
}
```

**Error Response**:
- Ticket not found → Error toast
- Wrong event → Error toast
- Network error → Error toast with retry option

#### 6. Display Confirmation Dialog

**UI Elements**:
- **Duplicate Check-In Modal** (if already checked in):
  - Yellow warning icon
  - "Already Checked In" message
  - Check-in timestamp displayed
  - "Close" button only
  
- **Check-In Confirmation Modal** (if not checked in):
  - Green success icon
  - "Ready to Check In" message
  - Ticket details card
  - "Cancel" and "Check In" buttons

**Attendee Details Shown**:
- Ticket number (large, mono font)
- Attendee name (or buyer name if no attendee)
- Email address
- "Purchased by: [Buyer]" note (if different from attendee)

#### 7. Confirm Check-In

1. Team member verifies attendee name matches person
2. Clicks "Check In" button
3. Loading spinner appears

**System Actions**:
- Mutation: `checkIn.checkIn({ eventId, qrCodeData })`
- **Optimistic Update**: Modal shows loading state
- Server validates ticket
- Server updates database
- Response returned

**Success**:
- Toast: "Checked in successfully!"
- Modal auto-closes
- Metrics refresh
- Table updates (if attendee visible)

**Already Checked In**:
- Response: `{ alreadyCheckedIn: true }`
- Toast: "Attendee was already checked in"
- Modal shows existing timestamp
- Team member can close and continue

**Error**:
- Toast with error message
- Modal remains open
- "Retry" option available

#### 8. Ready for Next Scan

1. Modal closed
2. Scanner ready for next QR code
3. Or close scanner and return to table
4. Metrics updated in background

**System State**:
- Cache invalidated for attendee list
- Metrics refetched
- Recent check-ins updated
- Ready for next attendee

---

## Workflow 3: Quick Mode Check-In (Mobile)

**Use Case**: High-volume check-in at event entrance using mobile device.

**Prerequisites**:
- Mobile device (phone or tablet)
- Check-in page open
- Camera permission granted

### Steps

#### 1. Switch to Quick Mode

1. Navigate to check-in page: `/events/[slug]/check-in`
2. Click "Quick Mode" toggle at top
3. Page switches to mobile-optimized layout

**System Actions**:
- URL updates: `?mode=quick`
- Page re-renders with `QuickCheckInInterface`
- Embedded QR scanner loads immediately (always visible)
- Ticket search form displays below scanner

**UI Changes**:
- Full table hidden
- Metrics hidden
- Large QR scanner visible at top
- Minimal controls
- Optimized for one-handed use

#### 2. Position Device for Scanning

**Setup**:
1. Hold device at waist height
2. Angle slightly toward attendee line
3. Keep scanner visible on screen
4. Ensure adequate lighting

**Best Practices**:
- Stand 3-4 feet from attendees
- Scanner should be primary focus on screen
- Minimize distractions
- Clear line of sight to QR codes

#### 3. Attendee Presents QR Code

1. Attendee approaches
2. Attendee shows ticket (phone or paper)
3. Team member positions camera over QR code
4. Auto-detection occurs (1-2 seconds)

**Embedded Scanner**:
- Always active (no modal to open)
- Continuous scanning mode
- Immediate feedback on detection
- No manual activation needed

#### 4. QR Code Scanned → Drawer Opens

**System Actions** (automatic):
- QR code detected and parsed
- `getTicketDetails` mutation called
- Server returns ticket data
- `QuickCheckInDrawer` slides up from bottom

**Animation**:
- 300ms slide-up animation
- Backdrop fades in (50% opacity)
- Drawer appears at bottom of screen
- Handle bar visible for visual affordance

**Drawer Contents**:
- Status header (green "Ready to Check In" or yellow "Already Checked In")
- Large ticket number (easy to verify)
- Attendee name (prominent)
- Email (smaller text)
- Buyer note (if different)
- Action buttons at bottom

#### 5. Verify Attendee

**Quick Visual Check**:
1. Glance at attendee name in drawer
2. Look at person standing in front
3. Names match? Proceed
4. Names don't match? Ask for ID or clarification

**Edge Cases**:
- **Different Name**: If "Purchased by: [Buyer]" shows, explain to attendee
- **Already Checked In**: Check timestamp, ask if first time arriving
- **Wrong Event**: Verify event name with attendee

#### 6. Confirm Check-In

**If Not Checked In**:
1. Click large "Check In" button at bottom
2. Button shows spinner: "Checking In..."
3. Wait 1-2 seconds for confirmation

**System Actions**:
- Mutation: `checkIn.checkIn({ eventId, qrCodeData })`
- **Optimistic Update**: Button disabled immediately
- Server processes check-in
- Response returned

**Success**:
- Toast: "Checked in successfully!"
- Drawer auto-closes (500ms delay)
- Scanner immediately ready for next code
- No manual closing needed

**If Already Checked In**:
1. Drawer shows yellow status icon
2. "Already Checked In" header
3. Timestamp of original check-in
4. Only "Close" button available
5. Click "Close" to dismiss
6. Explain to attendee (if confused)

#### 7. Next Attendee (Rapid Flow)

**Optimized Workflow**:
1. Drawer closes automatically after success
2. Scanner immediately active (no reset needed)
3. Next attendee presents QR code
4. Repeat from step 3

**Performance**:
- **Target**: <3 seconds per attendee
- **Breakdown**:
  - QR scan: 1-2 seconds
  - Drawer open: 0.3 seconds
  - Verify attendee: 0.5 seconds
  - Confirm: 1 second
  - Drawer close: 0.5 seconds
- **Throughput**: 20-30 attendees per minute per station

#### 8. Fallback to Manual Entry

**When QR Won't Scan**:
1. Scroll down to "Enter Ticket Number" form
2. Ask attendee for ticket number
3. Type in input field
4. Press Enter or click "Search"
5. Drawer opens with ticket details
6. Proceed with check-in as normal

**Common Reasons for Manual Entry**:
- Damaged QR code (torn, wet, faded)
- Poor lighting conditions
- Phone screen cracked over QR
- Wrong QR code displayed
- Camera malfunction

---

## Workflow 4: Handling Already Checked-In Attendees

**Use Case**: Attendee attempts to check in again (duplicate scan or confusion).

### Steps

#### 1. Scan or Search for Attendee

Follow normal check-in workflow:
- QR scan in Quick Mode or Dashboard Mode
- Manual search in table
- Ticket details fetched

#### 2. System Detects Previous Check-In

**Server Response**:
```typescript
{
  ticket: {
    isCheckedIn: true,
    checkedInAt: "2025-11-26T14:30:00Z",
    // ... other details
  }
}
```

**UI Detection**:
- `isCheckedIn === true` triggers different UI path
- Drawer/modal shows "Already Checked In" state
- Warning color scheme (yellow/orange)

#### 3. Display Already Checked-In UI

**Quick Mode Drawer**:
- Yellow check circle icon
- "Already Checked In" header
- "This attendee is all set" subtext
- Check-in timestamp prominently displayed
- Only "Close" button (no check-in action)

**Dashboard Mode (in table)**:
- Button shows "Already Checked In" (gray, disabled)
- Timestamp visible in Checked In At column
- Green "Checked In" badge

**Duplicate Check-In Modal** (if using modal flow):
- Warning icon
- "This ticket has already been checked in" message
- Timestamp of original check-in
- Team member who checked in (optional)
- "Close" button

#### 4. Team Member Verification

**Questions to Ask Attendee**:
1. "Have you already entered the event today?"
2. "Did you check in earlier at [timestamp]?"
3. "Is this your first time arriving?"

**Common Scenarios**:

**Scenario A: Attendee Forgot They Checked In**
- Politely inform them they're already checked in
- Confirm timestamp matches their arrival
- Allow entry

**Scenario B: Attendee Has Multiple Tickets**
- Check if they have other tickets
- Search for other ticket numbers under their name
- Check in the correct, unchecked ticket

**Scenario C: Ticket Shared/Stolen (Rare)**
- Check timestamp carefully
- If very recent (minutes ago), investigate
- Ask for ID to verify ticket owner
- Contact event organizer if suspicious

**Scenario D: System Error (Very Rare)**
- Check timestamp - if impossible time, may be error
- Contact system admin
- Manually verify in table view
- Allow entry and log issue

#### 5. Close Dialog and Continue

1. Click "Close" button
2. Drawer/modal dismisses
3. Explain situation to attendee
4. Allow entry (they're already checked in)
5. Ready for next attendee

**System Actions**:
- No database changes (idempotent check)
- No new timestamp created
- Original check-in preserved
- Metrics unchanged

---

## Workflow 5: Error Recovery

**Use Case**: Handling various error scenarios during check-in.

### Scenario A: QR Code Won't Scan

**Symptoms**:
- Scanner active but not detecting code
- Multiple scan attempts fail
- Error messages in console

**Troubleshooting Steps**:

1. **Check Lighting**:
   - Move to brighter area
   - Avoid direct sunlight glare
   - Use device flashlight if needed

2. **Check QR Code Quality**:
   - Is QR code damaged or blurred?
   - Is phone screen brightness sufficient?
   - Is QR code fully visible (not cut off)?

3. **Adjust Camera Distance**:
   - Try moving closer (6 inches)
   - Try moving farther (12 inches)
   - Ensure QR code fills scanning box

4. **Clean Camera Lens**:
   - Wipe lens with soft cloth
   - Remove any screen protector covering camera

5. **Try Different Browser**:
   - Safari vs Chrome may have different camera support
   - Some browsers may block camera on HTTP

6. **Fallback to Manual Entry**:
   - Ask attendee for ticket number (visible on ticket)
   - Type ticket number in search field
   - Check in manually via table or form

**System Actions**:
- Log error to console (for debugging)
- No automatic retry (manual retry via button)
- Fallback UI always available

### Scenario B: Ticket Not Found

**Symptoms**:
- Error toast: "Ticket not found for this event"
- API returns 404 NOT_FOUND

**Possible Causes**:
1. **Wrong Event**: Attendee has ticket for different event
2. **Typo**: Ticket number entered incorrectly
3. **Deleted Ticket**: Ticket refunded or cancelled
4. **Wrong QR Code**: Scanning unrelated QR (e.g., ad, URL)

**Resolution Steps**:

1. **Verify Event**:
   - Ask attendee: "Is your ticket for [Event Name]?"
   - Check ticket shows correct event
   - Redirect to correct event if wrong

2. **Verify Ticket Number**:
   - Double-check typed ticket number
   - Ensure no extra spaces or characters
   - Try copying from ticket email

3. **Search by Attendee Name** (Dashboard Mode):
   - Switch to attendee table view
   - Search by attendee name instead of ticket number
   - Locate ticket in list

4. **Check Ticket Status**:
   - Go to Tickets module
   - Search for ticket number
   - Check if ticket exists and is assigned
   - Check if ticket was refunded

5. **Contact Event Organizer**:
   - If ticket genuinely can't be found
   - Organizer can investigate in admin panel
   - May need manual resolution

**System Actions**:
- Error logged to server
- User sees friendly error message
- No check-in created
- Attendee not marked as checked in

### Scenario C: Permission Denied

**Symptoms**:
- Error: "You don't have permission to check in attendees"
- 403 FORBIDDEN response
- Redirect to event dashboard

**Possible Causes**:
1. **No CHECKIN Permission**: Collaborator without CHECKIN module access
2. **Pending Team Member**: Invitation not yet accepted
3. **Removed from Team**: Access revoked
4. **Not Logged In**: Session expired

**Resolution Steps**:

1. **Check Team Status**:
   - Verify team invitation was accepted
   - Status should be ACTIVE (not PENDING or REMOVED)

2. **Request Permission**:
   - Contact event owner
   - Request CHECKIN module permission
   - Owner grants permission in Team settings

3. **Re-Login**:
   - Sign out and sign back in
   - Refresh browser
   - Clear cache if needed

4. **Verify Correct Account**:
   - Ensure logged in with correct email
   - Check if using personal vs. work email
   - Switch accounts if needed

**System Actions**:
- Server blocks unauthorized access
- User redirected to safe page
- No data exposed
- Error logged for admin review

### Scenario D: Network/Server Error

**Symptoms**:
- Error: "An error occurred. Please try again."
- 500 INTERNAL_SERVER_ERROR or network timeout
- Loading spinner indefinitely

**Possible Causes**:
1. **Network Connectivity**: Poor internet connection
2. **Server Downtime**: Database or API unavailable
3. **Rate Limiting**: Too many requests
4. **Bug**: Unexpected server error

**Resolution Steps**:

1. **Check Network**:
   - Verify Wi-Fi/cellular connection
   - Try loading other websites
   - Switch networks if possible

2. **Retry Operation**:
   - Click "Retry" button (if available)
   - Wait 5-10 seconds and try again
   - Optimistic updates will rollback automatically

3. **Refresh Page**:
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Re-fetch all data
   - Resets component state

4. **Check Server Status**:
   - Visit status page (if available)
   - Contact event organizer
   - Check for announcements

5. **Fallback to Offline List**:
   - Use printed attendee list as backup
   - Manual check marks on paper
   - Sync check-ins later when online

**System Actions**:
- Automatic retry with exponential backoff (tRPC default)
- Optimistic updates rollback on failure
- Cache preserves last known state
- Error reported to monitoring (if configured)

---

## Workflow 6: Monitoring Check-In Progress

**Use Case**: Event organizer monitoring check-in rate and progress.

### Steps

#### 1. Open Dashboard Mode

1. Navigate to check-in page
2. Ensure Dashboard Mode is active (not Quick Mode)
3. Metrics display at top of page

#### 2. Review Metrics Dashboard

**Metrics Displayed**:

1. **Total Tickets**:
   - Total number of tickets sold for event
   - Static number (unless new tickets sold)
   - Foundation for percentage calculation

2. **Checked In Count**:
   - Number of attendees currently checked in
   - Updates every 10 seconds automatically
   - Green color for positive metric

3. **Not Checked In Count**:
   - Remaining attendees (Total - Checked In)
   - Updates every 10 seconds
   - Gray color for neutral metric

4. **Check-In Percentage**:
   - Percentage of tickets checked in
   - Formula: `(Checked In / Total) * 100`
   - Rounded to 1 decimal place
   - Progress bar visualization

**Example Display**:
```
Total Tickets: 500
Checked In: 342 (68.4%)
Not Checked In: 158
[████████████████████░░░░░░░░] 68.4%
```

#### 3. Monitor Recent Check-Ins Feed

**Recent Check-Ins List**:
- Shows last 10 check-ins
- Ordered by most recent first
- Updates every 10 seconds
- Each entry shows:
  - Attendee name
  - Ticket number
  - Time since check-in (e.g., "2 minutes ago")

**Use Cases**:
- Verify check-ins are happening
- Spot unusual patterns
- Monitor check-in speed
- Identify bottlenecks

#### 4. Analyze Check-In Rate

**Calculate Rate**:
```
Rate = Check-Ins / Time Period

Example:
- Event started: 10:00 AM
- Current time: 10:30 AM
- Checked in: 150 attendees
- Rate: 150 / 30 minutes = 5 per minute
```

**Predict Completion**:
```
Remaining = Total - Checked In
Time to Complete = Remaining / Rate

Example:
- Remaining: 350 attendees
- Rate: 5 per minute
- ETA: 350 / 5 = 70 minutes (11:40 AM)
```

**Identify Issues**:
- **Slow Rate**: Add more check-in stations
- **Decreasing Rate**: Lines backing up, need help
- **No Activity**: Verify check-in stations are operational

#### 5. Filter and Search for Specific Attendees

**Use Case**: Looking for specific attendee or VIPs

1. Use filter dropdown: "Not Checked In"
2. Search for attendee name or ticket number
3. Locate in filtered table
4. Monitor for their arrival

**VIP Monitoring**:
- Search for VIP ticket holders
- Check their status periodically
- Coordinate special greeting if needed

#### 6. Export Data (Future Enhancement)

**Potential Uses**:
- Download check-in report
- Send to event team
- Archive for records
- Analyze patterns post-event

---

## Workflow 7: Multi-Station Setup

**Use Case**: Large event with multiple check-in stations.

### Setup

#### 1. Determine Number of Stations

**Formula**:
```
Stations Needed = (Total Attendees / Expected Arrival Window) / (Check-Ins per Minute per Station)

Example:
- Total: 1000 attendees
- Arrival window: 60 minutes (doors open 1 hour before)
- Rate per station: 5 check-ins per minute
- Calculation: (1000 / 60) / 5 = 3.3 → 4 stations minimum
- Recommended: 5-6 stations (buffer for issues)
```

#### 2. Assign Team Members

**Roles**:
- **Check-In Operators** (4-6 people):
  - Use Quick Mode on mobile devices
  - Stationed at entry points
  - Focused on scanning QR codes

- **Troubleshooter** (1 person):
  - Use Dashboard Mode on laptop/tablet
  - Handle manual lookups
  - Assist with problems
  - Monitor overall progress

- **Coordinator** (1 person):
  - Monitor metrics dashboard
  - Direct attendees to shortest lines
  - Communicate with team via radio/chat
  - Escalate issues

#### 3. Position Stations

**Layout**:
```
Entrance
   ↓
[Station 1] [Station 2] [Station 3] [Station 4]
   ↓           ↓           ↓           ↓
          Event Floor
```

**Best Practices**:
- Evenly spaced (prevent crowding)
- Clear signage ("Check-In Here")
- Queue management (ropes, stanchions)
- Adequate lighting for QR scanning
- Power outlets for device charging

#### 4. Grant Permissions

**Before Event**:
1. Event owner adds all check-in team members
2. Assigns CHECKIN module permission to each
3. Team members accept invitations
4. Verify all have ACTIVE status

**Test Access**:
- Each team member logs in
- Opens check-in page
- Confirms they can see attendee list
- Tests QR scanner on sample ticket

#### 5. Coordinate During Event

**Communication**:
- Use walkie-talkies or group chat
- Coordinator monitors all stations
- Report issues immediately
- Share attendee counts periodically

**Load Balancing**:
- Coordinator directs attendees to shortest lines
- Move team members between stations if needed
- Close/open stations based on flow

#### 6. Handle Concurrent Check-Ins

**System Behavior**:
- Multiple team members can check in simultaneously
- No race conditions (database handles concurrency)
- If two people scan same ticket:
  - First request: Check-in succeeds
  - Second request: Returns `alreadyCheckedIn: true`
  - Both team members see appropriate UI
  - No duplicate check-in created

**Best Practice**:
- Each station handles its own queue
- Avoid multiple people scanning same attendee
- Trust system to handle edge cases

---

## Workflow 8: Post-Event Review

**Use Case**: Analyzing check-in data after the event.

### Steps

#### 1. Access Final Metrics

1. Navigate to check-in page
2. View final counts:
   - Total tickets sold
   - Total checked in
   - No-shows (Total - Checked In)
   - Final percentage

**Example Report**:
```
Event: Tech Conference 2025
Total Tickets: 500
Checked In: 487 (97.4%)
No-Shows: 13 (2.6%)
```

#### 2. Review Patterns

**Questions to Answer**:
- What time did check-ins peak?
- How long did it take to check in all attendees?
- What was average check-in rate?
- Were there any bottlenecks?

**Data Sources**:
- Recent check-ins feed (historical)
- Check-in timestamps on each ticket
- Manual observation notes

#### 3. Identify Improvements

**Common Findings**:
- **Slow Check-In**: Need more stations next time
- **QR Issues**: Better lighting or printed backups
- **Confusion**: Clearer signage or instructions
- **No-Shows**: Consider overbooking or waitlist

#### 4. Generate Reports (Future)

**Potential Reports**:
- Check-in timeline (graph of check-ins over time)
- Check-in rate by station
- No-show analysis
- Average time per check-in
- Peak vs. off-peak periods

---

## Best Practices Summary

### For Quick Check-In (Mobile)
1. ✅ Use Quick Mode for entry points
2. ✅ Hold device at waist height for ergonomics
3. ✅ Ensure good lighting for QR scanning
4. ✅ Verify attendee name before confirming
5. ✅ Have manual entry ready as fallback

### For Dashboard Monitoring
1. ✅ Use Dashboard Mode for overview and management
2. ✅ Monitor metrics every 10-15 minutes
3. ✅ Filter by "Not Checked In" to see remaining attendees
4. ✅ Use search for specific attendee lookups
5. ✅ Keep printed backup list for emergencies

### For Team Coordination
1. ✅ Assign clear roles before event
2. ✅ Test all devices and permissions beforehand
3. ✅ Have backup devices and chargers ready
4. ✅ Establish communication method (radio, chat)
5. ✅ Designate troubleshooter for edge cases

### For Error Handling
1. ✅ Always have manual entry fallback
2. ✅ Don't block attendees for technical issues
3. ✅ Log issues for post-event review
4. ✅ Empower team to make judgment calls
5. ✅ Prioritize attendee experience over perfect data

---

## Related Documentation

- [Check-In Module Overview](./README.md)
- [Backend Documentation](./backend.md)
- [Frontend Documentation](./frontend.md)
