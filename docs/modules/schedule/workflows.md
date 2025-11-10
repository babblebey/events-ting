# Schedule Workflows

## Workflow 1: Create Schedule Entry

**Actors**: Event Organizer  
**Trigger**: Click "Add Session" button on schedule management page

### Steps

1. **Open Form**
   - UI: ScheduleManager displays ScheduleEntryForm in modal
   - Form loads with event timezone and speaker list

2. **Fill Session Details**
   - Enter title and description
   - Select date (date picker)
   - Set start and end times (time pickers in event timezone)
   - Optionally specify location
   - Choose session type from dropdown
   - Optionally assign track with color

3. **Assign Speakers** (Optional)
   - Multi-select speakers from event speaker list
   - Can assign multiple speakers (for panels, co-presenters)
   - Default role: "speaker"

4. **Check for Conflicts**
   - Frontend: Debounced call to `schedule.checkOverlap`
   - If overlaps exist, show warning alert
   - User can proceed despite warning (intentional conflicts allowed)

5. **Submit Form**
   - API: `schedule.create`
   - Input validation (title, description length, time order)
   - Backend combines date+time in event timezone → converts to UTC
   - Creates ScheduleEntry record
   - Creates SpeakerSession records for each assigned speaker

6. **Update UI**
   - Modal closes
   - Schedule timeline refreshes
   - New entry appears in chronological order
   - Track list updates if new track created

### Success Criteria

- Schedule entry created in database
- Speakers linked via SpeakerSession junction table
- Entry visible in organizer dashboard
- Entry appears in public schedule (if event published)

### Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `NOT_FOUND` | Event doesn't exist | Redirect to event list |
| `FORBIDDEN` | User is not organizer | Show permission error |
| Validation Error | Invalid input (empty title, end before start) | Show inline error messages |
| Network Error | API call failed | Show retry button |

---

## Workflow 2: Edit Schedule Entry

**Actors**: Event Organizer  
**Trigger**: Click "Edit" button on schedule entry card

### Steps

1. **Open Edit Form**
   - Fetch entry with `schedule.getById`
   - Pre-fill form with existing data
   - Convert UTC times to event timezone for display

2. **Modify Fields**
   - User changes any field (title, time, speakers, etc.)
   - Form tracks `updatedAt` timestamp from original data

3. **Re-check Conflicts** (If Time/Location Changed)
   - Call `schedule.checkOverlap` with `excludeId` (this entry)
   - Show warning if new conflicts detected

4. **Submit Update**
   - API: `schedule.update`
   - Include original `updatedAt` for concurrency control
   - Backend verifies timestamp matches current database value
   - If mismatch → throw `CONFLICT` error

5. **Handle Concurrency Conflict**
   - If entry was modified by another user:
     - Show alert: "This session was modified by another user"
     - Offer to refresh and see changes
     - User must review and re-submit

6. **Success**
   - Entry updated in database
   - Speaker assignments replaced (delete old, create new)
   - UI refreshes with updated data

### Success Criteria

- Entry successfully updated
- No lost updates (concurrency control works)
- Changes visible immediately in UI

### Concurrency Control Flow

```
1. User A loads entry (updatedAt: T1)
2. User B loads entry (updatedAt: T1)
3. User B saves changes (updatedAt: T2)
4. User A saves changes with updatedAt=T1
5. Backend detects T1 ≠ T2 → CONFLICT
6. User A sees error, refreshes, sees User B's changes
```

---

## Workflow 3: Delete Schedule Entry

**Actors**: Event Organizer  
**Trigger**: Click "Delete" button on schedule entry

### Steps

1. **Show Confirmation**
   - Modal displays: "Delete session: [title]?"
   - Warning: "This will also remove speaker assignments"

2. **Confirm Deletion**
   - User clicks "Delete" button
   - API: `schedule.delete`

3. **Cascade Delete**
   - ScheduleEntry record deleted
   - All SpeakerSession records cascade delete
   - Speakers remain (only assignment removed)

4. **Update UI**
   - Entry removed from timeline
   - If last entry in track, track disappears from filter
   - Success message shown

### Success Criteria

- Entry deleted from database
- Speaker assignments removed
- Speakers themselves not affected
- UI reflects deletion immediately

---

## Workflow 4: Assign Speakers to Existing Session

**Actors**: Event Organizer  
**Trigger**: Edit schedule entry to add/change speakers

### Steps

1. **Open Edit Form**
   - Current speakers pre-selected in multi-select

2. **Modify Speaker List**
   - Add new speakers (checked in multi-select)
   - Remove speakers (unchecked)
   - No duplicate prevention needed (unique constraint)

3. **Save Changes**
   - API: `schedule.update` with new `speakerIds` array
   - Backend deletes all existing SpeakerSession records
   - Creates new SpeakerSession for each selected speaker

4. **Update Displays**
   - Schedule timeline shows new speaker avatars
   - Speaker profile pages update with session link

### Success Criteria

- SpeakerSession records match new selection
- Old assignments removed, new ones created
- Transactional (all-or-nothing)

---

## Workflow 5: Detect Scheduling Conflicts

**Actors**: Event Organizer  
**Trigger**: Creating or editing entry with time/location

### Steps

1. **Trigger Overlap Check**
   - User enters/changes start time, end time, or location
   - Frontend debounces input (500ms delay)
   - API: `schedule.checkOverlap`

2. **Backend Detection**
   - Query entries in same event
   - Filter by location (if specified)
   - Find entries with overlapping time ranges
   - Apply precise overlap logic (`doTimeRangesOverlap`)

3. **Display Results**
   - If no overlap: Green checkmark or no message
   - If overlap detected:
     - Warning alert (yellow background)
     - List conflicting sessions with titles and times
     - Message: "Conflict with 2 other sessions in Main Hall"

4. **User Decision**
   - **Option 1**: Change time or location to avoid conflict
   - **Option 2**: Proceed with conflict (intentional overlap is valid)

5. **Proceed or Cancel**
   - Overlap check is **non-blocking**
   - User can save entry despite warnings
   - Useful for breaks, parallel tracks, or split sessions

### Success Criteria

- Conflicts accurately detected
- Clear warning displayed
- User retains control (can override)

### Intentional Overlap Scenarios

- Breaks at same time in all rooms
- Parallel tracks in different locations
- Repeated sessions at different times

---

## Workflow 6: View Public Schedule (Attendee)

**Actors**: Public User (Attendee)  
**Trigger**: Navigate to `/events/{slug}/schedule`

### Steps

1. **Load Schedule Page**
   - Server-side fetch: `schedule.list` for event
   - Fetch tracks: `schedule.getTracks`
   - Only show if event status = "published"

2. **Display Timeline**
   - Group entries by date
   - Show in event timezone
   - Display speakers with photos and names
   - Show track colors and session types

3. **Filter by Track** (Optional)
   - Click track badge or use filter dropdown
   - Update timeline to show only selected track
   - Preserves date grouping

4. **Filter by Date** (Optional)
   - Multi-day events show date navigation
   - Click date to filter entries
   - Maintains track filter if applied

5. **View Session Details**
   - Click session card to expand description
   - See full speaker bios
   - View location and time details

### Success Criteria

- Schedule displays correctly in event timezone
- Filters work (track, date)
- Mobile-responsive layout
- Accessible (keyboard navigation, screen readers)

---

## Workflow 7: Bulk Import Schedule (Future)

**Status**: Planned, not yet implemented

### Concept

Allow organizers to upload CSV or JSON file with schedule data.

**Format**:
```csv
title,description,date,startTime,endTime,location,track,trackColor,sessionType,speakerEmails
Opening Keynote,"Welcome address",2025-06-15,09:00,10:00,Main Hall,Keynotes,#3B82F6,keynote,"john@example.com,jane@example.com"
```

**Steps**:
1. Upload file
2. Parse and validate
3. Match speaker emails to existing speakers
4. Bulk create entries
5. Show preview before committing
6. Handle errors (invalid dates, missing speakers)

---

## Workflow 8: Reorder Sessions (Future)

**Status**: Placeholder in router

### Concept

Drag-and-drop reordering for sessions at the same time.

**Implementation**:
- Add `displayOrder` field to ScheduleEntry
- Use `schedule.reorder` mutation
- Update entries with new order values
- Timeline displays by `displayOrder` within same time slot

**Use Case**: Multiple workshops at 2:00 PM, organizer wants specific display order.

---

## Common Patterns

### Timezone Conversion Flow

```
User Input → Event Timezone → UTC (Storage) → UTC (Transfer) → Event Timezone (Display)
```

### Error Recovery

All mutations use optimistic updates with error rollback:
```typescript
onMutate: (variables) => {
  // Optimistically update UI
  const previousData = cache.getData();
  cache.setData(optimisticData);
  return { previousData };
},
onError: (err, variables, context) => {
  // Rollback on error
  cache.setData(context.previousData);
  showErrorToast(err.message);
},
```

---

## Related Documentation

- [Schedule Backend →](./backend.md)
- [Schedule Frontend →](./frontend.md)
- [Schedule Data Model →](./data-model.md)
- [Speaker Workflows →](../speakers/workflows.md)
- [CFP Acceptance Workflow →](../cfp/workflows.md#workflow-4-accept-cfp-proposal)
