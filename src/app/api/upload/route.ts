/**
 * File upload API route handler
 * Handles speaker photos, event images, and other file uploads
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "~/server/auth";
import {
  storage,
  generateUniqueFilename,
  validateFileType,
  validateFileSize,
  FILE_UPLOAD_LIMITS,
} from "~/server/services/storage";

/**
 * POST /api/upload
 * Upload a file and return its public URL
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fileType = formData.get("type") as string | null; // 'image' | 'document'

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Determine file type and limits
    const type = fileType ?? "image";
    const isImage = type === "image";

    const allowedTypes = isImage
      ? FILE_UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES
      : FILE_UPLOAD_LIMITS.ALLOWED_DOCUMENT_TYPES;

    const maxSize = isImage
      ? FILE_UPLOAD_LIMITS.MAX_IMAGE_SIZE
      : FILE_UPLOAD_LIMITS.MAX_DOCUMENT_SIZE;

    // Validate file type
    if (!validateFileType(file, allowedTypes)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (!validateFileSize(file, maxSize)) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return NextResponse.json(
        {
          error: `File too large. Maximum size: ${maxSizeMB}MB`,
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const filename = generateUniqueFilename(file.name);

    // Determine upload path based on type
    const uploadPath = isImage
      ? `images/${filename}`
      : `documents/${filename}`;

    // Upload file
    const url = await storage.upload(file, uploadPath);

    // Log upload for audit trail
    console.log("[Upload] File uploaded", {
      userId: session.user.id,
      filename,
      size: file.size,
      type: file.type,
      url,
    });

    return NextResponse.json({
      url,
      filename,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("[Upload] Error uploading file", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload file",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload
 * Delete an uploaded file
 */
export async function DELETE(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get URL from query params
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "No URL provided" },
        { status: 400 }
      );
    }

    // Delete file
    await storage.delete(url);

    // Log deletion for audit trail
    console.log("[Upload] File deleted", {
      userId: session.user.id,
      url,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Upload] Error deleting file", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete file",
      },
      { status: 500 }
    );
  }
}
