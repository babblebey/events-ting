/**
 * Storage service interface for file uploads
 * MVP: Local filesystem storage
 * Future: AWS S3, Cloudflare R2, or other cloud storage
 */

import { mkdir, writeFile, unlink } from "fs/promises";
import { dirname, join } from "path";

/**
 * Storage adapter interface - allows swapping storage backends
 */
export interface StorageAdapter {
  /**
   * Upload a file and return its public URL
   * @param file - File to upload
   * @param path - Relative path for the file (e.g., "speakers/photo.jpg")
   * @returns Public URL to access the file
   */
  upload(file: File, path: string): Promise<string>;

  /**
   * Delete a file by its URL
   * @param url - Public URL of the file to delete
   */
  delete(url: string): Promise<void>;

  /**
   * Check if a file exists
   * @param url - Public URL to check
   * @returns true if file exists
   */
  exists(url: string): Promise<boolean>;
}

/**
 * Local filesystem storage adapter (MVP)
 * Stores files in the /public/uploads directory
 */
class LocalStorageAdapter implements StorageAdapter {
  private readonly publicDir = "./public";
  private readonly uploadsDir = "uploads";

  async upload(file: File, path: string): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    const publicPath = `/${this.uploadsDir}/${path}`;
    const fsPath = join(this.publicDir, this.uploadsDir, path);

    // Create directory if it doesn't exist
    await mkdir(dirname(fsPath), { recursive: true });

    // Write file to disk
    await writeFile(fsPath, buffer);

    // Return public URL (Next.js serves from /public)
    return publicPath;
  }

  async delete(url: string): Promise<void> {
    // Convert public URL to filesystem path
    const fsPath = join(this.publicDir, url);

    try {
      await unlink(fsPath);
    } catch (error) {
      // File might not exist, ignore error
      console.warn(`[Storage] Failed to delete file: ${url}`, error);
    }
  }

  async exists(url: string): Promise<boolean> {
    const fsPath = join(this.publicDir, url);

    try {
      const { access } = await import("fs/promises");
      await access(fsPath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * AWS S3 storage adapter (future implementation)
 * Requires: aws-sdk or @aws-sdk/client-s3
 */
/*
class S3StorageAdapter implements StorageAdapter {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly cdnDomain?: string;

  constructor(config: {
    region: string;
    bucketName: string;
    cdnDomain?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  }) {
    this.bucketName = config.bucketName;
    this.cdnDomain = config.cdnDomain;

    this.s3Client = new S3Client({
      region: config.region,
      credentials: config.accessKeyId
        ? {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey!,
          }
        : undefined,
    });
  }

  async upload(file: File, path: string): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `uploads/${path}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        ACL: "public-read", // Or use CloudFront + signed URLs
      })
    );

    // Return CDN URL if configured, otherwise S3 URL
    if (this.cdnDomain) {
      return `https://${this.cdnDomain}/${key}`;
    }

    return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
  }

  async delete(url: string): Promise<void> {
    // Extract key from URL
    const key = url.split(".com/")[1];

    if (!key) {
      throw new Error(`Invalid S3 URL: ${url}`);
    }

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );
  }

  async exists(url: string): Promise<boolean> {
    const key = url.split(".com/")[1];

    if (!key) {
      return false;
    }

    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }
}
*/

/**
 * Cloudflare R2 storage adapter (future implementation)
 * Compatible with S3 API, but uses Cloudflare's network
 */
/*
class R2StorageAdapter implements StorageAdapter {
  // Similar implementation to S3StorageAdapter
  // Uses Cloudflare R2 endpoint instead of AWS S3
}
*/

/**
 * Storage service singleton
 * Exports the configured storage adapter
 */
function createStorageService(): StorageAdapter {
  const storageType = process.env.STORAGE_TYPE ?? "local";

  switch (storageType) {
    case "local":
      return new LocalStorageAdapter();
    // case "s3":
    //   return new S3StorageAdapter({
    //     region: process.env.AWS_REGION!,
    //     bucketName: process.env.S3_BUCKET!,
    //     cdnDomain: process.env.CDN_DOMAIN,
    //     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    //   });
    // case "r2":
    //   return new R2StorageAdapter({ ... });
    default:
      throw new Error(`Unknown storage type: ${storageType}`);
  }
}

/**
 * Export configured storage service
 */
export const storage = createStorageService();

/**
 * Utility: Generate unique filename with timestamp and UUID
 * @param originalName - Original filename
 * @returns Sanitized unique filename
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = originalName.split(".").pop() ?? "jpg";
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  return `${timestamp}-${uuid}.${ext}`;
}

/**
 * Utility: Validate file type
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns true if file type is allowed
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Utility: Validate file size
 * @param file - File to validate
 * @param maxSizeBytes - Maximum size in bytes
 * @returns true if file size is within limit
 */
export function validateFileSize(file: File, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes;
}

/**
 * Constants for file validation
 */
export const FILE_UPLOAD_LIMITS = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_DOCUMENT_TYPES: ["application/pdf"],
} as const;
