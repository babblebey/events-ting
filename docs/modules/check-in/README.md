# Check-In Module

## Overview

The Check-In module enables **event team members to track attendee arrival** at the event through QR code scanning or manual ticket lookup. It provides real-time check-in statistics and supports both mobile-optimized quick check-ins and comprehensive dashboard management.

### Purpose

This module solves the problem of efficiently managing event entry by:
- Providing fast check-in via QR code scanning (<3 seconds)
- Offering manual ticket lookup for fallback scenarios
- Tracking check-in metrics in real-time
- Preventing duplicate check-ins
- Supporting multiple check-in stations simultaneously

**Example Flow**:
1. Team member opens check-in page on mobile device
2. Attendee arrives and presents ticket QR code
3. Team member scans QR code with camera
4. System validates ticket and shows attendee details
5. Team member confirms check-in
6. Attendee is marked as checked in with timestamp
7. Metrics update automatically

## Key Concepts

### Two Operational Modes

The check-in system supports two distinct modes optimized for different scenarios:

#### Quick Mode (Mobile-First)
- **Purpose**: Fast, single-attendee check-in at entry points
- **Interface**: Embedded QR scanner always visible
- **Best For**: Mobile devices, check-in stations, entry gates
- **Features**:
  - Continuous QR scanning
  - Ticket number search form
  - Slide-up drawer for confirmation
  - Minimal UI for speed
  - Touch-optimized controls

#### Dashboard Mode (Comprehensive)
- **Purpose**: Complete attendee management and oversight
- **Interface**: Full table view with metrics
- **Best For**: Desktop/tablet, event management office
- **Features**:
  - Paginated attendee list
  - Search and filter controls
  - QR scanner modal (on-demand)
  - Real-time metrics dashboard
  - Bulk overview

### Check-In States

| State | Description | Actions Available |
|-------|-------------|-------------------|
| **Not Checked In** | Attendee has not arrived | Check In, View Details |
| **Checked In** | Attendee confirmed present | View Check-In Time, Already Checked In |
| **Processing** | Check-in in progress | Loading State |

### QR Code Integration

The module supports QR code scanning through device camera with multiple format support:

**Supported QR Formats**:
1. **Simple Ticket Number**: `TKT-2025-ABC123`
2. **JSON Format**: `{"ticketNumber": "TKT-2025-ABC123"}`
3. **JWT Tokens** (future support)

**QR Code Features**:
- Automatic format detection and parsing
- Camera permission handling
- Real-time scan feedback
- Error recovery and retry
- Manual entry fallback

### Optimistic Updates

The module uses optimistic UI updates for instant feedback:

1. **User Action**: Team member clicks "Check In"
2. **Optimistic Update**: UI immediately shows "Checked In"
3. **Server Request**: Mutation sent to backend
4. **Success**: Update confirmed, metrics refreshed
5. **Failure**: Rollback to previous state, show error

This provides sub-second perceived performance even on slower connections.

### Permission-Based Access

**Required Permission**: `CHECKIN` module access

**Who Can Access**:
- **Team Owners**: Automatic access to all modules
- **Team Collaborators**: Must have "CHECKIN" in modulePermissions array
- **Active Members Only**: PENDING or REMOVED status cannot access

**What Happens Without Permission**:
- Redirect to event dashboard
- 403 Forbidden error
- Clear error message

## Features

### Core Functionality
- **QR Code Scanning**: Camera-based QR code detection and validation
- **Manual Ticket Lookup**: Search by ticket number for fallback
- **Dual Check-In**: Works with both ticket number and QR code data
- **Duplicate Prevention**: 100% prevention of double check-ins
- **Real-Time Metrics**: Live statistics with auto-refresh
- **Optimistic Updates**: Instant UI feedback before server confirmation
- **Timezone Handling**: Check-in timestamps in event timezone
- **Mobile Optimization**: Touch-friendly, responsive design

### Dashboard Features
- **Attendee List Table**: Paginated view of all event attendees
- **Search Functionality**: Find attendees by ticket number
- **Status Filtering**: Filter by check-in status (All/Checked In/Not Checked In)
- **Recent Check-Ins Feed**: Last 10 check-ins displayed
- **Metrics Display**: Total tickets, check-in count, percentage
- **Progress Visualization**: Visual progress bar for check-in rate
- **Auto-Refresh**: 10-second intervals for live updates

### Quick Mode Features
- **Embedded Scanner**: Always-on QR scanner for continuous operation
- **Ticket Search Form**: Manual entry when QR not available
- **Slide-Up Drawer**: Mobile-optimized confirmation UI
- **Success Animations**: Visual feedback for completed check-ins
- **Auto-Close**: Drawer closes after successful check-in
- **Fast Workflow**: Optimized for high-volume check-in scenarios

## User Roles

### Event Team Members (with CHECKIN permission)

**Capabilities**:
- Scan QR codes to check in attendees
- Search for attendees by ticket number
- View check-in status and metrics
- Confirm attendee details before check-in
- View check-in timestamps
- Monitor real-time statistics
- **Full check-in control** for the event

**Access Level**:
- Must be OWNER or COLLABORATOR with CHECKIN permission
- Must have ACTIVE status (not PENDING or REMOVED)
- Read and write access to check-in data

### Event Owners

**Additional Capabilities**:
- Manage team member permissions
- Add/remove CHECKIN access for collaborators
- View all check-in activity
- Access check-in from any device

### Attendees

**No Direct Access**:
- Cannot access check-in interface
- Present QR code for scanning
- Receive confirmation of check-in
- No self-check-in capability

## Module Dependencies

**This module depends on:**
- **[Tickets Module](../tickets/)**: Uses ticket data for check-in validation
- **[Attendees Module](../attendees/)**: Displays attendee information
- **[Events Module](../events/)**: Scoped to specific event, uses timezone
- **[Team Module](../team/)**: Permission checking, records check-in operator

**This module is required by:**
- Future analytics/reporting modules
- Future capacity management features

## Module Scope

### This Module Handles:
- ✅ Checking in attendees via QR code scanning
- ✅ Checking in attendees via manual ticket lookup
- ✅ Displaying check-in status and timestamps
- ✅ Real-time check-in metrics and statistics
- ✅ Preventing duplicate check-ins
- ✅ Recording who performed each check-in
- ✅ Mobile and desktop check-in workflows
- ✅ Permission-based access control

### This Module Does NOT Handle:
- ❌ Ticket sales or registration (see Registration module)
- ❌ Ticket assignment (see Tickets module)
- ❌ Attendee data management (see Attendees module)
- ❌ Event capacity limits (future feature)
- ❌ Badge printing (future feature)
- ❌ Access control to event areas (future feature)

## Relationship to Other Modules

### vs Tickets Module
- **Tickets**: Manages ticket instances, QR codes, assignment
- **Check-In**: Updates check-in status on existing tickets
- Tickets module creates tickets; Check-In module marks them as used

### vs Attendees Module
- **Attendees**: Manages attendee data (name, email, custom fields)
- **Check-In**: Tracks physical arrival at event
- Attendees module shows who's registered; Check-In shows who arrived

### vs Registration Module
- **Registration**: Handles ticket purchases and buyer data
- **Check-In**: Confirms attendee arrival (not buyer)
- Registration creates tickets; Check-In validates attendance

### Backend Implementation Note

The Check-In module:
- **Updates** the `Ticket` model (isCheckedIn, checkedInAt, checkedInBy)
- **Reads** from `Attendee` and `Registration` models for display
- **Uses** `TeamMember` for permission checking
- **Records** the team member who performed each check-in

## Quick Links

- [Backend Documentation](./backend.md) - tRPC procedures and API
- [Frontend Documentation](./frontend.md) - Components and hooks
- [Workflows](./workflows.md) - Step-by-step user workflows

## Related Files

### Backend
- `src/server/api/routers/check-in.ts` - Check-in router
- `src/lib/utils/date.ts` - Timezone utilities
- `src/lib/qr-code.ts` - QR code parsing utilities

### Frontend
- `src/app/events/[slug]/check-in/page.tsx` - Main check-in page
- `src/components/check-in/` - All check-in components
- `src/hooks/use-check-in.ts` - Check-in operations hook

### Database Schema
- `Ticket` model - Check-in status fields
- `Attendee` model - Attendee information
- `Registration` model - Buyer information
- `TeamMember` model - Permission checking

### Specifications
- `specs/004-attendee-check-in/` - Full feature specification
- `specs/004-attendee-check-in/spec.md` - User stories and requirements
- `specs/004-attendee-check-in/contracts/check-in-api.ts` - API contracts

## Feature Coverage

This module implements the following specification requirements:

### Priority 1 (P1)
- **Manual Check-In via List View** (User Story #1)
  - Search attendees by ticket number
  - View attendee details before check-in
  - One-click check-in with confirmation
  - Duplicate check-in prevention

### Priority 2 (P2)
- **QR Code Scanning for Check-In** (User Story #2)
  - Camera-based QR scanning
  - Multiple QR format support
  - Automatic ticket validation
  - <3 second check-in time

### Priority 3 (P3)
- **Attendee Status Filtering and Overview** (User Story #3)
  - Real-time metrics dashboard
  - Filter by check-in status
  - Recent check-ins feed
  - Progress visualization

## Getting Started

### For Event Team Members

#### 1. Access Check-In Interface

**Desktop/Tablet**:
1. Navigate to your event dashboard
2. Click "Check-In" in the navigation menu
3. Route: `/events/[event-slug]/check-in`

**Mobile**:
1. Open event on mobile browser
2. Tap "Check-In" menu item
3. Automatically loads Quick Mode

#### 2. Choose Your Mode

**Quick Mode** (Recommended for Entry Points):
- Click "Quick Mode" toggle at top
- Scanner appears immediately
- Ideal for: Entry gates, mobile devices, high-volume scenarios

**Dashboard Mode** (Recommended for Management):
- Default view on page load
- Shows full attendee list with metrics
- Ideal for: Desktop, oversight, searching specific attendees

#### 3. Check In Attendees

**Via QR Code** (Fastest):
1. Position attendee's QR code in camera view
2. Auto-detection occurs within 1-2 seconds
3. Drawer/modal shows attendee details
4. Confirm check-in
5. Success feedback displayed

**Via Manual Search**:
1. Type ticket number in search field
2. Find attendee in list (Dashboard) or drawer appears (Quick)
3. Verify attendee details
4. Click "Check In" button
5. Confirmation displayed

#### 4. Monitor Progress

**View Metrics**:
- Total tickets sold
- Number checked in
- Number remaining
- Check-in percentage
- Recent check-ins feed

**Metrics Auto-Refresh**:
- Updates every 10 seconds
- No manual refresh needed
- Real-time across all devices

### For Event Organizers

#### Setting Up Check-In

1. **Grant CHECKIN Permission**:
   - Go to Team settings
   - Add team members who will check in attendees
   - Enable "CHECKIN" module permission
   - Team members must accept invitation

2. **Prepare Devices**:
   - Mobile devices for Quick Mode at entry
   - Tablets/laptops for Dashboard Mode at desk
   - Ensure camera permissions granted
   - Test QR scanning before event

3. **Brief Team Members**:
   - Show Quick Mode vs Dashboard Mode
   - Practice QR scanning
   - Explain manual fallback process
   - Review duplicate check-in handling

#### During Event

- Monitor metrics dashboard for attendance rate
- Use Dashboard Mode for overview and searching
- Deploy Quick Mode at entry points
- Handle edge cases (lost tickets, duplicate scans)

## Best Practices

### For Team Members
1. **Use Quick Mode at Entry**: Faster workflow for arrivals
2. **Grant Camera Permission**: Essential for QR scanning
3. **Manual Fallback**: Use ticket search if QR scan fails
4. **Verify Details**: Always confirm attendee name before check-in
5. **Watch for Duplicates**: System prevents but alert attendee if already checked in

### For Organizers
1. **Multiple Stations**: Deploy several check-in points for large events
2. **Print Backup Lists**: Have printed attendee list for tech failures
3. **Test Before Event**: Practice check-in flow with team
4. **Monitor Metrics**: Watch check-in rate to identify bottlenecks
5. **Permission Management**: Only grant CHECKIN to trusted team members

### For Developers
1. **Optimistic Updates**: Always use for instant feedback
2. **Error Handling**: Gracefully handle network failures
3. **Permission Checks**: Verify on every request
4. **Timezone Awareness**: Use event timezone for all timestamps
5. **Mobile First**: Optimize for mobile devices

## Performance Characteristics

### Response Times
- **QR Code Check-In**: <3 seconds (target)
- **Manual Check-In**: <10 seconds (target)
- **Metrics Refresh**: <2 seconds
- **Search Results**: <1 second (debounced)

### Scalability
- **Pagination**: 50 attendees per page
- **Database Indexes**: On ticketNumber, qrCodeData, isCheckedIn
- **Concurrent Check-Ins**: Multiple team members supported
- **Auto-Refresh**: 10-second intervals prevent overwhelming server

### Mobile Optimization
- **Responsive Design**: Works on all screen sizes
- **Touch Targets**: Minimum 44px for buttons
- **Drawer UI**: Native-feeling slide-up panels
- **Camera Integration**: Efficient QR scanning
- **Offline Support**: Future enhancement

## Security Considerations

### Permission Enforcement
- All API endpoints check CHECKIN permission
- Server-side validation on every request
- Cannot bypass via client manipulation
- Team member status verified (must be ACTIVE)

### Audit Trail
- Every check-in records:
  - Timestamp (UTC)
  - Team member who performed check-in (checkedInBy)
  - Ticket number checked in
- Immutable once set (can't change checkedInBy)

### Data Privacy
- Check-in data visible only to team with permission
- Attendee email not displayed in Quick Mode
- QR codes validated server-side only
- No client-side ticket storage

## Common Scenarios

### Scenario 1: Morning Rush at Entry

**Situation**: 200 attendees arriving in 30-minute window

**Recommended Approach**:
1. Deploy 4-6 team members with mobile devices
2. All use Quick Mode
3. QR scanning primary method
4. Manual lookup for forgotten tickets
5. Monitor metrics on central dashboard

**Expected Performance**:
- 40-50 check-ins per station per 30 minutes
- 3-5 seconds average per attendee
- 200 attendees processed in 25-30 minutes

### Scenario 2: Late Arrival Search

**Situation**: Attendee arrives 2 hours late, can't find ticket

**Recommended Approach**:
1. Use Dashboard Mode
2. Search by attendee name or email
3. Verify identity with ID
4. Manual check-in via ticket number
5. Optionally resend ticket email (Attendees module)

### Scenario 3: Duplicate QR Scan

**Situation**: Attendee presents same QR code twice

**System Response**:
1. QR scanned successfully
2. Drawer shows "Already Checked In"
3. Displays original check-in timestamp
4. No duplicate check-in created
5. Team member can dismiss and explain to attendee

### Scenario 4: QR Code Won't Scan

**Situation**: Damaged ticket, poor lighting, camera issues

**Fallback Process**:
1. Switch to manual ticket search
2. Ask attendee for ticket number (visible on ticket)
3. Type in search field
4. Verify attendee details
5. Complete check-in manually

## Troubleshooting

### Camera Not Working

**Problem**: QR scanner shows "Camera permission denied"

**Solutions**:
1. Check browser camera permissions
2. Grant access when prompted
3. Reload page after granting permission
4. Try different browser if persists
5. Use manual entry as fallback

### QR Code Not Scanning

**Problem**: Scanner active but not detecting QR

**Common Causes**:
1. Poor lighting - move to brighter area
2. Damaged QR code - use manual entry
3. Wrong QR code - verify it's event ticket
4. Distance too far/close - adjust camera distance

**Solutions**:
- Improve lighting conditions
- Clean camera lens
- Try manual ticket number entry
- Regenerate QR code (Tickets module)

### Already Checked In Error

**Problem**: System says attendee already checked in

**Verification**:
1. Check timestamp of original check-in
2. Verify it's same ticket number
3. Check if attendee is confused (has multiple tickets)

**Actions**:
- If genuine duplicate: Explain to attendee, dismiss modal
- If error (extremely rare): Contact system admin
- If multiple tickets: Check in other ticket numbers

### Permission Denied

**Problem**: Team member can't access check-in page

**Common Causes**:
1. No CHECKIN permission granted
2. Team invitation not accepted (PENDING status)
3. Access removed (REMOVED status)
4. Not logged in to correct account

**Solutions**:
- Event owner: Grant CHECKIN permission
- Team member: Accept team invitation
- Verify logged in with correct email
- Contact event organizer

### Metrics Not Updating

**Problem**: Dashboard shows stale data

**Solutions**:
1. Wait 10 seconds for auto-refresh
2. Manually refresh browser if needed
3. Check internet connection
4. Verify multiple check-ins happening (cross-check with team)

## Integration Points

### With Tickets Module
- Reads: ticketNumber, qrCodeData, assignedToId
- Updates: isCheckedIn, checkedInAt, checkedInBy
- Validates ticket belongs to event
- Uses existing ticket data (no duplication)

### With Attendees Module
- Displays attendee name and email
- Shows buyer name when different from attendee
- Links to attendee records
- No updates to attendee data

### With Events Module
- Scoped to specific event by slug
- Uses event timezone for all timestamps
- Validates team member belongs to event
- Respects event settings

### With Team Module
- Checks CHECKIN module permission
- Records team member who checked in attendee
- Validates ACTIVE status
- Uses team member ID for audit trail

## Technical Architecture

### Frontend Stack
- **React Server Components**: Page-level data fetching
- **Client Components**: Interactive UI (scanner, drawer, forms)
- **TanStack Query**: Cache management via tRPC
- **html5-qrcode**: QR scanning library
- **Flowbite React**: UI components
- **date-fns-tz**: Timezone handling

### Backend Stack
- **tRPC**: Type-safe API layer
- **Prisma**: Database ORM
- **Zod**: Schema validation
- **PostgreSQL**: Database (via Prisma)

### State Management
- **URL State**: Search and filter parameters
- **React Query Cache**: Server state
- **Optimistic Updates**: Immediate UI feedback
- **Auto-Refresh**: Polling intervals

## Future Enhancements

- **Offline Mode**: Check in without internet, sync later
- **Bulk Check-In**: Check in multiple attendees at once
- **Check-Out**: Track when attendees leave
- **Capacity Warnings**: Alert when approaching venue capacity
- **Badge Printing**: Print badges directly from check-in
- **Access Zones**: Different check-in points for VIP/GA
- **Analytics Dashboard**: Detailed check-in patterns and insights
- **Export Check-In Data**: Download check-in reports
- **Multi-Language**: Support multiple languages
- **Voice Confirmation**: Audio feedback for accessibility

## Related Documentation

- [Backend Documentation](./backend.md) - tRPC procedures and API contracts
- [Frontend Documentation](./frontend.md) - Components, pages, and hooks
- [Workflows](./workflows.md) - Detailed user workflows
- [Tickets Module](../tickets/) - Ticket management and QR codes
- [Attendees Module](../attendees/) - Attendee data management
- [Team Module](../team/) - Permission system
