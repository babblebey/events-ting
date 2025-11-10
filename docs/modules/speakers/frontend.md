# Speakers Frontend Documentation

## Pages

### Dashboard Speakers Page (Organizer)

**Location**: `src/app/(dashboard)/[id]/speakers/page.tsx`

Client-side page for managing event speakers.

**Features**:
- Grid display of speaker cards
- "Add Speaker" button
- Edit and delete actions on each card
- Empty state with call-to-action
- Modals for add/edit/delete

**Route**: `/{eventId}/speakers`

---

### Public Speaker Directory

**Location**: `src/app/events/[slug]/speakers/page.tsx`

Public listing of event speakers.

**Features**:
- Grid of speaker cards (read-only)
- Click to view full profile
- Responsive layout
- Only shows for published events

**Route**: `/events/{slug}/speakers`

---

### Public Speaker Profile

**Location**: `src/app/events/[slug]/speakers/[id]/page.tsx`

Detailed speaker profile page.

**Features**:
- Full bio display
- Social media links
- Photo
- List of sessions with links
- Back to speaker directory link

**Route**: `/events/{slug}/speakers/{speakerId}`

---

## Components

### SpeakerForm

**Location**: `src/components/speakers/speaker-form.tsx`

**Purpose**: Form for creating and editing speaker profiles

**Props**:
```typescript
{
  eventId: string,
  initialData?: Partial<{
    id: string,
    name: string,
    bio: string,
    email: string,
    photo: string,
    twitter: string,
    github: string,
    linkedin: string,
    website: string,
  }>,
  onSuccess?: (speakerId: string) => void,
  onCancel?: () => void,
}
```

**Form Fields**:
- **Name** (text input, required)
- **Email** (email input, required)
- **Bio** (textarea, required, 10-5000 chars)
- **Photo** (file upload + preview)
- **Twitter** (text input, optional)
- **GitHub** (text input, optional)
- **LinkedIn** (text input, optional)
- **Website** (URL input, optional)

**Photo Upload Flow**:
1. User selects image file
2. Preview shown immediately (using FileReader)
3. On form submit, upload image first to `/api/upload`
4. Use returned path in speaker mutation
5. Show upload progress indicator

**Validation**:
- Name: 2-200 characters
- Email: Valid email format
- Bio: 10-5000 characters
- Website: Valid URL format
- Duplicate email check on submit

**Usage**:
```tsx
{/* Create mode */}
<SpeakerForm
  eventId={eventId}
  onSuccess={(speakerId) => {
    console.log(`Speaker created: ${speakerId}`);
    closeModal();
    refetch();
  }}
  onCancel={() => closeModal()}
/>

{/* Edit mode */}
<SpeakerForm
  eventId={eventId}
  initialData={existingSpeaker}
  onSuccess={() => {
    closeModal();
    refetch();
  }}
/>
```

---

### SpeakerCard

**Location**: `src/components/speakers/speaker-card.tsx`

**Purpose**: Individual speaker display card

**Props**:
```typescript
{
  speaker: {
    id: string,
    name: string,
    bio: string,
    photo?: string | null,
    twitter?: string | null,
    github?: string | null,
    linkedin?: string | null,
    website?: string | null,
    speakerSessions?: Array<{
      scheduleEntry: {
        id: string,
        title: string,
        startTime: Date,
        endTime: Date,
      },
    }>,
  },
  showSessions?: boolean,
  onEdit?: () => void,
  onDelete?: () => void,
}
```

**Display Elements**:
- Speaker photo (circular, with fallback initials)
- Name (heading)
- Bio excerpt (truncated to 150 chars)
- Social media icons (clickable links)
- Session count badge
- Edit/Delete buttons (organizer view)

**Responsive Design**:
- Mobile: Full-width cards
- Tablet: 2-column grid
- Desktop: 3-column grid

**Usage**:
```tsx
{/* Organizer view */}
<SpeakerCard
  speaker={speaker}
  showSessions={true}
  onEdit={() => setEditingSpeaker(speaker.id)}
  onDelete={() => setDeletingSpeaker(speaker.id)}
/>

{/* Public view */}
<SpeakerCard
  speaker={speaker}
  showSessions={false}
/>
```

---

### SpeakerProfile

**Location**: `src/components/speakers/speaker-profile.tsx`

**Purpose**: Full speaker profile display

**Props**:
```typescript
{
  speaker: {
    id: string,
    name: string,
    bio: string,
    email: string,
    photo?: string | null,
    twitter?: string | null,
    github?: string | null,
    linkedin?: string | null,
    website?: string | null,
    event: {
      id: string,
      name: string,
      slug: string,
      timezone: string,
    },
    speakerSessions?: Array<{
      id: string,
      role?: string | null,
      scheduleEntry: {
        id: string,
        title: string,
        description: string,
        startTime: Date,
        endTime: Date,
        location?: string | null,
        track?: string | null,
        sessionType?: string | null,
      },
    }>,
    cfpSubmissions?: Array<{
      id: string,
      title: string,
      status: string,
    }>,
  },
  eventSlug: string,
  showBackLink?: boolean,
}
```

**Sections**:
1. **Header**: Photo, name, social links
2. **Bio**: Full biography text
3. **Sessions**: List of speaking sessions with times and details
4. **Related**: Links back to event and schedule

**Features**:
- Full-width layout
- Collapsible sections on mobile
- Session cards link to schedule
- Social media icons with external links
- Back to speakers directory button

---

## Photo Handling

### Upload Component

```tsx
<Label
  htmlFor="photo-upload"
  className="cursor-pointer border-dashed border-2 p-4"
>
  <HiUpload className="h-10 w-10" />
  <span>Click to upload or drag and drop</span>
  <span className="text-xs">PNG, JPG up to 5MB</span>
</Label>
<input
  id="photo-upload"
  type="file"
  accept="image/*"
  hidden
  onChange={handlePhotoChange}
/>
```

### Preview Display

```tsx
{photoPreview && (
  <div className="relative">
    <img
      src={photoPreview}
      alt="Preview"
      className="h-20 w-20 rounded-full object-cover"
    />
    <Button
      size="sm"
      color="light"
      onClick={handleRemovePhoto}
    >
      Remove
    </Button>
  </div>
)}
```

### Fallback Avatar

```tsx
{speaker.photo ? (
  <img
    src={speaker.photo}
    alt={speaker.name}
    className="h-16 w-16 rounded-full"
  />
) : (
  <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
    {speaker.name.charAt(0)}
  </div>
)}
```

---

## Social Media Links

### Icon Display

```tsx
const socialLinks = [
  { icon: FaTwitter, url: speaker.twitter && `https://twitter.com/${speaker.twitter}`, label: "Twitter" },
  { icon: FaGithub, url: speaker.github && `https://github.com/${speaker.github}`, label: "GitHub" },
  { icon: FaLinkedin, url: speaker.linkedin && `https://linkedin.com/in/${speaker.linkedin}`, label: "LinkedIn" },
  { icon: FaGlobe, url: speaker.website, label: "Website" },
];

<div className="flex gap-2">
  {socialLinks.map((link) =>
    link.url ? (
      <a
        key={link.label}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-600 hover:text-blue-600"
      >
        <link.icon className="h-5 w-5" />
      </a>
    ) : null
  )}
</div>
```

---

## State Management

### Speaker List Page

```tsx
const [showAddModal, setShowAddModal] = useState(false);
const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
const [deletingSpeaker, setDeletingSpeaker] = useState<string | null>(null);

const { data: speakers, isLoading, refetch } = api.speaker.list.useQuery({
  eventId,
});

const deleteMutation = api.speaker.delete.useMutation({
  onSuccess: () => {
    setDeletingSpeaker(null);
    void refetch();
  },
});
```

### Form Submission

```tsx
const createMutation = api.speaker.create.useMutation({
  onSuccess: (data) => {
    onSuccess?.(data.id);
    router.refresh();
  },
  onError: (error) => {
    setErrors({ submit: error.message });
  },
});

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Upload photo if file selected
  if (photoFile) {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", photoFile);
    
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    
    const { path } = await response.json();
    formData.photo = path;
    setIsUploading(false);
  }
  
  // Submit form
  if (isEditing) {
    updateMutation.mutate({ id, ...formData });
  } else {
    createMutation.mutate({ eventId, ...formData });
  }
};
```

---

## Empty States

### No Speakers

```tsx
<div className="text-center py-12">
  <HiPlus className="h-16 w-16 mx-auto text-blue-600" />
  <h3 className="text-xl font-semibold mt-4">No Speakers Yet</h3>
  <p className="text-gray-500 mt-2">
    Get started by adding your first speaker or accepting CFP submissions
  </p>
  <Button onClick={() => setShowAddModal(true)} className="mt-4">
    <HiPlus className="mr-2" />
    Add Speaker
  </Button>
</div>
```

---

## Modals

### Delete Confirmation

```tsx
<Modal show={!!deletingSpeaker} onClose={() => setDeletingSpeaker(null)}>
  <ModalHeader>Delete Speaker</ModalHeader>
  <ModalBody>
    <Alert color="warning">
      <span className="font-medium">Warning:</span> This will also remove the
      speaker from all assigned sessions. This action cannot be undone.
    </Alert>
    <p className="mt-4">Are you sure you want to delete this speaker?</p>
  </ModalBody>
  <ModalFooter>
    <Button color="gray" onClick={() => setDeletingSpeaker(null)}>
      Cancel
    </Button>
    <Button
      color="failure"
      onClick={() => handleDelete(deletingSpeaker)}
      disabled={deleteMutation.isPending}
    >
      {deleteMutation.isPending ? "Deleting..." : "Delete Speaker"}
    </Button>
  </ModalFooter>
</Modal>
```

---

## Accessibility

- Semantic HTML (`<article>` for cards, proper headings)
- Alt text for all images
- ARIA labels for icon-only buttons
- Keyboard navigation for cards and links
- Focus management in modals
- Screen reader announcements for updates

---

## Related Documentation

- [Speakers Backend →](./backend.md)
- [Speakers Data Model →](./data-model.md)
- [Speakers Workflows →](./workflows.md)
