"use client";

/**
 * SpeakerForm Component
 * Form for creating and editing speaker profiles with photo upload and social links
 */

import { useState } from "react";
import { Button, Label, Textarea } from "flowbite-react";
import { FormField, FormSection, FormError } from "@/components/ui/form-field";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { HiUpload } from "react-icons/hi";

interface SpeakerFormData {
  name: string;
  bio: string;
  email: string;
  photo?: string;
  twitter?: string;
  github?: string;
  linkedin?: string;
  website?: string;
}

interface SpeakerFormProps {
  eventId: string;
  initialData?: Partial<SpeakerFormData> & { id?: string };
  onSuccess?: (speakerId: string) => void;
  onCancel?: () => void;
}

export function SpeakerForm({ eventId, initialData, onSuccess, onCancel }: SpeakerFormProps) {
  const router = useRouter();
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<SpeakerFormData>({
    name: initialData?.name ?? "",
    bio: initialData?.bio ?? "",
    email: initialData?.email ?? "",
    photo: initialData?.photo ?? "",
    twitter: initialData?.twitter ?? "",
    github: initialData?.github ?? "",
    linkedin: initialData?.linkedin ?? "",
    website: initialData?.website ?? "",
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialData?.photo ?? null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = api.speaker.create.useMutation({
    onSuccess: (data) => {
      if (onSuccess) {
        onSuccess(data.id);
      } else {
        router.refresh();
      }
    },
    onError: (error) => {
      setErrors({ general: error.message });
    },
  });

  const updateMutation = api.speaker.update.useMutation({
    onSuccess: (data) => {
      if (onSuccess) {
        onSuccess(data.id);
      } else {
        router.refresh();
      }
    },
    onError: (error) => {
      setErrors({ general: error.message });
    },
  });

  const handleChange = (field: keyof SpeakerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrors({ photo: "Please select a valid image file" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ photo: "Image size must be less than 5MB" });
      return;
    }

    setPhotoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Clear photo error
    if (errors.photo) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.photo;
        return newErrors;
      });
    }
  };

  const uploadPhoto = async (): Promise<string | undefined> => {
    if (!photoFile) return formData.photo;

    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", photoFile);
      formDataUpload.append("type", "image");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error ?? "Failed to upload photo");
      }

      const data = await response.json() as { url: string };
      return data.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload photo. Please try again.";
      setErrors({ photo: message });
      return undefined;
    } finally {
      setIsUploading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.bio || formData.bio.length < 10) {
      newErrors.bio = "Bio must be at least 10 characters";
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Validate social links format
    if (formData.twitter && formData.twitter.length > 0) {
      // Twitter handle format (with or without @)
      if (!/^@?[A-Za-z0-9_]{1,15}$/.test(formData.twitter)) {
        newErrors.twitter = "Invalid Twitter handle";
      }
    }

    if (formData.github && formData.github.length > 0) {
      // GitHub username format
      if (!/^[A-Za-z0-9-]{1,39}$/.test(formData.github)) {
        newErrors.github = "Invalid GitHub username";
      }
    }

    if (formData.website && formData.website.length > 0) {
      try {
        new URL(formData.website);
      } catch {
        newErrors.website = "Please enter a valid URL";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Upload photo if new file selected
    let photoUrl = formData.photo;
    if (photoFile) {
      photoUrl = await uploadPhoto();
      if (!photoUrl && photoFile) {
        return; // Upload failed, error already set
      }
    }

    const submitData = {
      ...formData,
      photo: photoUrl || undefined,
      // Clean up optional fields (remove if empty string)
      twitter: formData.twitter?.trim() || undefined,
      github: formData.github?.trim() || undefined,
      linkedin: formData.linkedin?.trim() || undefined,
      website: formData.website?.trim() || undefined,
    };

    if (isEditing && initialData?.id) {
      updateMutation.mutate({
        id: initialData.id,
        ...submitData,
      });
    } else {
      createMutation.mutate({
        eventId,
        ...submitData,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || isUploading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && <FormError message={errors.general} />}

      <FormSection
        title="Speaker Information"
        description="Basic information about the speaker"
      >
        <div className="mb-4">
          <div className="mb-2 block">
            <Label htmlFor="name">Full Name<span className="ml-1 text-red-500">*</span></Label>
          </div>
          {errors.name && (
            <p className="mb-2 text-sm text-red-600 dark:text-red-500">{errors.name}</p>
          )}
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
            placeholder="John Doe"
            required
          />
        </div>

        <div className="mb-4">
          <div className="mb-2 block">
            <Label htmlFor="email">Email Address<span className="ml-1 text-red-500">*</span></Label>
          </div>
          {errors.email && (
            <p className="mb-2 text-sm text-red-600 dark:text-red-500">{errors.email}</p>
          )}
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
            placeholder="speaker@example.com"
            required
          />
        </div>

        <div className="mb-4">
          <div className="mb-2 block">
            <Label htmlFor="bio">Biography<span className="ml-1 text-red-500">*</span></Label>
          </div>
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            Tell us about the speaker's background and expertise
          </p>
          {errors.bio && (
            <p className="mb-2 text-sm text-red-600 dark:text-red-500">{errors.bio}</p>
          )}
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            rows={4}
            placeholder="Speaker's professional background, expertise, and accomplishments..."
            required
          />
        </div>

        <div className="mb-4">
          <div className="mb-2 block">
            <Label htmlFor="photo">Profile Photo</Label>
          </div>
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            Upload a professional headshot (max 5MB, JPG/PNG)
          </p>
          {errors.photo && (
            <p className="mb-2 text-sm text-red-600 dark:text-red-500">{errors.photo}</p>
          )}
          <div className="space-y-4">
            {photoPreview && (
              <div className="flex items-center space-x-4">
                <img
                  src={photoPreview}
                  alt="Speaker preview"
                  className="h-20 w-20 rounded-full object-cover"
                />
                <Button
                  color="light"
                  size="sm"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                    handleChange("photo", "");
                  }}
                >
                  Remove
                </Button>
              </div>
            )}
            <Label
              htmlFor="photo-upload"
              className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <div className="flex flex-col items-center justify-center pb-6 pt-5">
                <HiUpload className="mb-3 h-10 w-10 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG (MAX. 5MB)
                </p>
              </div>
              <input
                id="photo-upload"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handlePhotoChange}
              />
            </Label>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Social Links"
        description="Connect the speaker's social profiles (optional)"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Twitter Handle"
            name="twitter"
            type="text"
            value={formData.twitter}
            onChange={(e) => handleChange("twitter", e.target.value)}
            error={errors.twitter}
            helpText="Username without @"
            placeholder="johndoe"
          />

          <FormField
            label="GitHub Username"
            name="github"
            type="text"
            value={formData.github}
            onChange={(e) => handleChange("github", e.target.value)}
            error={errors.github}
            placeholder="johndoe"
          />

          <FormField
            label="LinkedIn Profile"
            name="linkedin"
            type="text"
            value={formData.linkedin}
            onChange={(e) => handleChange("linkedin", e.target.value)}
            error={errors.linkedin}
            helpText="Full profile URL"
            placeholder="https://linkedin.com/in/johndoe"
          />

          <FormField
            label="Website"
            name="website"
            type="url"
            value={formData.website}
            onChange={(e) => handleChange("website", e.target.value)}
            error={errors.website}
            placeholder="https://example.com"
          />
        </div>
      </FormSection>

      <div className="flex justify-end space-x-3">
        {onCancel && (
          <Button
            type="button"
            color="light"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending}
        >
          {isPending ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Update Speaker" : "Add Speaker")}
        </Button>
      </div>
    </form>
  );
}
