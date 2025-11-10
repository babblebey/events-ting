# Speakers Workflows

## Workflow 1: Create Speaker Manually

**Actors**: Event Organizer  
**Trigger**: Click "Add Speaker" button

### Steps

1. **Open Form**: Modal displays SpeakerForm component
2. **Fill Basic Info**: Name, email, bio (required)
3. **Upload Photo** (Optional): Click upload, select image, see preview
4. **Add Social Links** (Optional): Twitter, GitHub, LinkedIn, website
5. **Submit**: API validates and creates speaker
6. **Check Duplicates**: Backend verifies email not already used for this event
7. **Success**: Speaker added to list, modal closes

### Success Criteria
- Speaker record created in database
- Visible in organizer's speaker list
- Available for schedule session assignment

---

## Workflow 2: Assign Speaker to Schedule Session

**Actors**: Event Organizer  
**Trigger**: Edit schedule entry or use speaker assignment UI

### Steps

1. **Select Session**: From schedule management page
2. **Choose Speakers**: Multi-select from event speakers
3. **Set Roles** (Optional): speaker, moderator, panelist
4. **Submit**: Creates SpeakerSession junction records
5. **Update Displays**: Speaker visible on session card, session visible on speaker profile

### Success Criteria
- SpeakerSession records created
- Schedule entry shows assigned speakers
- Speaker profile shows assigned sessions

---

## Workflow 3: Auto-Create from CFP Acceptance

**Actors**: Event Organizer (accepting proposal)  
**Trigger**: Click "Accept" on CFP submission

### Steps

1. **Organizer Reviews Proposal**: In CFP management dashboard
2. **Click Accept**: Triggers `cfp.acceptProposal`
3. **Auto-Create Speaker**:
   - Name from `submission.speakerName`
   - Email from `submission.speakerEmail`
   - Bio from `submission.speakerBio`
   - Photo from `submission.speakerPhoto` (if URL provided)
   - Social links from submission
4. **Link Submission**: `submission.speakerId` set to new speaker
5. **Send Email**: Acceptance notification sent
6. **Success**: Speaker appears in speakers list

### Success Criteria
- Speaker record created automatically
- Submission linked to speaker
- Organizer can edit speaker details post-creation
- Speaker can be assigned to sessions normally

---

## Workflow 4: Edit Speaker Profile

**Actors**: Event Organizer  
**Trigger**: Click "Edit" on speaker card

### Steps

1. **Open Form**: Pre-filled with existing data
2. **Modify Fields**: Change any field (name, bio, photo, links)
3. **Upload New Photo** (Optional): Replace existing photo
4. **Check Email Change**: If email changed, verify no duplicate
5. **Submit**: Update speaker record
6. **Success**: Changes reflected immediately

### Success Criteria
- Speaker updated in database
- Changes visible in all displays (cards, profiles, sessions)

---

## Workflow 5: Delete Speaker

**Actors**: Event Organizer  
**Trigger**: Click "Delete" on speaker card

### Steps

1. **Show Warning**: Modal with cascade delete notice
2. **Confirm**: User clicks "Delete"
3. **Cascade Delete**:
   - Speaker record deleted
   - All SpeakerSession assignments deleted
   - Schedule entries remain (only assignment removed)
   - CFP submissions unlinked (`speakerId` set to null)
4. **Update UI**: Speaker removed from list

### Success Criteria
- Speaker deleted from database
- Sessions no longer show this speaker
- Schedule entries still exist
- No orphaned junction records

---

## Workflow 6: View Speaker Directory (Public)

**Actors**: Attendee or Public User  
**Trigger**: Navigate to `/events/{slug}/speakers`

### Steps

1. **Load Page**: Fetch all speakers for event
2. **Display Grid**: Speaker cards with photos, names, bio excerpts
3. **Click Speaker**: Navigate to full profile page
4. **View Profile**: See full bio, social links, sessions
5. **Click Session**: Navigate to schedule entry

### Success Criteria
- Only shows for published events
- All speakers visible
- Links work correctly
- Mobile-responsive

---

## Workflow 7: View Speaker Profile (Public)

**Actors**: Attendee or Public User  
**Trigger**: Click speaker from directory or schedule

### Steps

1. **Load Profile**: Fetch speaker with sessions
2. **Display Info**: Photo, name, bio, social links
3. **Show Sessions**: List of speaking sessions with times
4. **Click Session**: Link to schedule entry
5. **Social Links**: External links to social profiles

### Success Criteria
- Full bio visible
- Sessions ordered chronologically
- Social links open in new tabs
- Back navigation works

---

## Related Documentation

- [Speakers Backend →](./backend.md)
- [Speakers Frontend →](./frontend.md)
- [Speakers Data Model →](./data-model.md)
- [Schedule Workflows →](../schedule/workflows.md)
- [CFP Acceptance Workflow →](../cfp/workflows.md#workflow-4-accept-cfp-proposal)
