# Storage Setup

This guide covers file storage configuration for Events-Ting, including the current local storage implementation and future cloud storage options.

---

## Overview

Events-Ting currently uses **local file storage** for uploaded images, with planned support for **AWS S3** in production environments.

### Supported File Types
- **Speaker photos**: JPG, PNG, WebP
- **Event images**: JPG, PNG (future)
- **Sponsor logos**: PNG, SVG (future)

### Current Storage Locations
```
public/
└── uploads/
    └── images/
        ├── speakers/
        │   ├── abc123.jpg
        │   └── def456.png
        └── events/ (future)
```

---

## Local File Storage (Current)

### Configuration

No additional configuration required. Files are stored in `public/uploads/images/` by default.

**Advantages**:
- ✅ Zero configuration
- ✅ No additional costs
- ✅ Simple for development
- ✅ Fast local access

**Limitations**:
- ❌ Not suitable for production at scale
- ❌ Lost on server restart (serverless/Vercel)
- ❌ No CDN acceleration
- ❌ Storage limits on hosting platforms

---

### Directory Structure

Ensure the upload directory exists and has write permissions:

```bash
# Create upload directories
mkdir -p public/uploads/images/speakers
mkdir -p public/uploads/images/events

# Set permissions (Linux/macOS)
chmod 755 public/uploads
chmod 755 public/uploads/images
```

**Git**: The `public/uploads/` directory is in `.gitignore` to avoid committing uploaded files.

---

### Upload Implementation

**Location**: Image upload is handled in the speaker creation/update flow.

**File naming convention**:
```typescript
// Generate unique filename
const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
// Example: 1699564234567-a7f3k9.jpg
```

**File path**:
```typescript
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images', 'speakers');
const filePath = path.join(uploadDir, uniqueFilename);
```

---

### Image Upload Flow

1. **Client** uploads file via form (e.g., speaker photo)
2. **API route** receives file as base64 or multipart data
3. **Validation**: Check file size and type
4. **Save**: Write file to `public/uploads/images/speakers/`
5. **Database**: Store relative path in database: `/uploads/images/speakers/abc123.jpg`
6. **Display**: Image accessible at `http://localhost:3000/uploads/images/speakers/abc123.jpg`

---

### File Validation

**Location**: Image validation before upload

```typescript
// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Validation
if (file.size > MAX_FILE_SIZE) {
  throw new Error('File size exceeds 5MB');
}

if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error('Invalid file type. Only JPG, PNG, and WebP allowed.');
}
```

---

### Cleanup Orphaned Files

When deleting a speaker, the associated photo file should also be deleted:

```typescript
// Delete speaker and photo
if (speaker.photoUrl) {
  const filePath = path.join(process.cwd(), 'public', speaker.photoUrl);
  await fs.unlink(filePath).catch(() => {
    // File may already be deleted
  });
}

await ctx.db.speaker.delete({ where: { id: speakerId } });
```

---

## AWS S3 Setup (Future)

For production deployments, AWS S3 provides scalable, durable storage.

### Prerequisites

- AWS Account
- S3 bucket created
- IAM user with S3 access

---

### Step 1: Create S3 Bucket

1. Log in to [AWS Console](https://console.aws.amazon.com)
2. Navigate to **S3** service
3. Click "Create bucket"
4. Configure:
   - **Bucket name**: `events-ting-uploads` (must be globally unique)
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
   - **Block all public access**: Uncheck (for public image access)
   - **Bucket versioning**: Enable (optional)
5. Click "Create bucket"

---

### Step 2: Configure Bucket Policy

Allow public read access to images:

1. Go to bucket → Permissions tab
2. Bucket Policy → Edit
3. Add policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::events-ting-uploads/*"
    }
  ]
}
```

4. Save changes

---

### Step 3: Create IAM User

1. Navigate to **IAM** → Users
2. Click "Add user"
3. User name: `events-ting-uploader`
4. Access type: Programmatic access
5. Attach policy: `AmazonS3FullAccess` (or create custom policy with limited permissions)
6. Create user
7. **Save Access Key ID and Secret Access Key** (shown only once)

---

### Step 4: Environment Variables

Add to `.env` (production):

```bash
AWS_S3_BUCKET="events-ting-uploads"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

**Vercel**: Add these as environment variables in project settings.

---

### Step 5: Install AWS SDK

```bash
pnpm add @aws-sdk/client-s3
```

---

### Step 6: Implement S3 Upload

**Create utility**: `src/lib/s3.ts`

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToS3(
  file: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: `speakers/${filename}`,
    Body: file,
    ContentType: contentType,
    ACL: 'public-read',
  });

  await s3Client.send(command);

  // Return public URL
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/speakers/${filename}`;
}

export async function deleteFromS3(fileKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: fileKey,
  });

  await s3Client.send(command);
}
```

---

### Step 7: Update Upload Logic

**Modify speaker router** to use S3:

```typescript
// In src/server/api/routers/speaker.ts
import { uploadToS3, deleteFromS3 } from '@/lib/s3';

// Upload photo
if (input.photoFile) {
  const buffer = Buffer.from(input.photoFile, 'base64');
  const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
  
  // Upload to S3
  const photoUrl = await uploadToS3(buffer, filename, 'image/jpeg');
  
  // Save URL to database
  speaker.photoUrl = photoUrl;
}

// Delete photo
if (speaker.photoUrl) {
  const fileKey = speaker.photoUrl.split('.com/')[1]; // Extract key from URL
  await deleteFromS3(fileKey);
}
```

---

### Step 8: CloudFront CDN (Optional)

For faster global image delivery:

1. Create CloudFront distribution
2. Origin: S3 bucket
3. Update `uploadToS3` to return CloudFront URL:
   ```typescript
   return `https://d1234567890.cloudfront.net/speakers/${filename}`;
   ```

---

## Comparison: Local vs S3

| Feature | Local Storage | AWS S3 |
|---------|---------------|--------|
| **Setup** | None | AWS account + configuration |
| **Cost** | Free (hosting limits) | $0.023/GB/month + requests |
| **Persistence** | Lost on redeploy (Vercel) | Persistent |
| **Scalability** | Limited | Unlimited |
| **CDN** | No | Yes (CloudFront) |
| **Best for** | Development | Production |

---

## Image Optimization

### Next.js Image Component

Use Next.js `<Image>` for automatic optimization:

```tsx
import Image from 'next/image';

<Image
  src={speaker.photoUrl || '/default-avatar.png'}
  alt={speaker.name}
  width={200}
  height={200}
  className="rounded-full"
/>
```

**Benefits**:
- Automatic WebP/AVIF conversion
- Lazy loading
- Responsive images
- Blur placeholder

---

### Remote Patterns (S3)

Configure Next.js to allow S3 images:

**In `next.config.js`**:
```javascript
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'events-ting-uploads.s3.us-east-1.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'd1234567890.cloudfront.net',
        pathname: '/**',
      },
    ],
  },
};
```

---

## Storage Limits

### Vercel

- **Free**: 100GB bandwidth/month
- **Pro**: 1TB bandwidth/month
- **File size limit**: 4.5MB per file (for API routes)

**Recommendation**: Use S3 for production if expecting >100GB traffic.

---

### AWS S3 Pricing

- **Storage**: $0.023/GB/month (first 50 TB)
- **PUT requests**: $0.005 per 1,000 requests
- **GET requests**: $0.0004 per 1,000 requests
- **Data transfer out**: $0.09/GB (first 10 TB)

**Example**:
- 10GB storage = $0.23/month
- 100,000 image views = $0.04/month
- **Total**: ~$0.30/month

---

## Security Best Practices

### ✅ DO
- Validate file types and sizes
- Generate unique, unpredictable filenames
- Set appropriate CORS headers
- Use signed URLs for private files (future)
- Scan uploaded files for malware (future)
- Implement rate limiting on uploads

### ❌ DON'T
- Trust user-provided filenames (path traversal risk)
- Allow executable file uploads
- Store files without validation
- Use predictable filenames (security risk)
- Expose AWS credentials in client-side code

---

## Troubleshooting

### "File not found" Error

**Cause**: File path incorrect or file deleted  
**Solution**:
1. Check `speaker.photoUrl` in database
2. Verify file exists in `public/uploads/images/speakers/`
3. Check file permissions (755 for directories, 644 for files)

---

### "Permission denied" Writing File

**Cause**: Upload directory doesn't have write permissions  
**Solution**:
```bash
chmod -R 755 public/uploads
```

---

### "Access Denied" S3 Upload

**Cause**: IAM user lacks S3 permissions  
**Solution**:
1. Verify IAM user has `PutObject` permission
2. Check bucket policy allows uploads
3. Verify AWS credentials in environment variables

---

### Images Not Loading (S3)

**Cause**: Bucket not public or incorrect URL  
**Solution**:
1. Check bucket policy allows public read
2. Verify URL format: `https://bucket-name.s3.region.amazonaws.com/key`
3. Check CORS configuration if loading from different domain

---

### "File too large"

**Cause**: File exceeds size limit  
**Solution**:
1. Implement client-side image compression
2. Show error message to user
3. Consider increasing limit (with validation)

---

## Migration: Local to S3

When moving from local storage to S3:

### Step 1: Upload Existing Files

```typescript
// Script: scripts/migrate-to-s3.ts
import { db } from '@/server/db';
import { uploadToS3 } from '@/lib/s3';
import fs from 'fs/promises';
import path from 'path';

const speakers = await db.speaker.findMany({
  where: { photoUrl: { startsWith: '/uploads/' } },
});

for (const speaker of speakers) {
  const localPath = path.join(process.cwd(), 'public', speaker.photoUrl);
  const file = await fs.readFile(localPath);
  const filename = path.basename(speaker.photoUrl);
  
  const s3Url = await uploadToS3(file, filename, 'image/jpeg');
  
  await db.speaker.update({
    where: { id: speaker.id },
    data: { photoUrl: s3Url },
  });
  
  console.log(`Migrated: ${speaker.name}`);
}
```

### Step 2: Run Migration

```bash
npx tsx scripts/migrate-to-s3.ts
```

### Step 3: Update Upload Logic

Switch upload handler from local to S3 (as shown in Step 7).

---

## Related Documentation

- [Environment Variables](./environment-variables.md) - Configure AWS credentials
- [Speakers Module](../modules/speakers/README.md) - Speaker photo uploads
- [Vercel Deployment](./vercel-deployment.md) - Production storage considerations
