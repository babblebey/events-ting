"use client";

/**
 * Registration Lookup Page
 * Allows buyers to lookup their registration by email to manage their tickets
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, TextInput, Card, Alert } from "flowbite-react";
import { HiMail, HiInformationCircle } from "react-icons/hi";
import { api } from "@/trpc/react";

export default function RegistrationLookupPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [email, setEmail] = useState("");
  const [lookupEmail, setLookupEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: event } = api.event.getBySlug.useQuery({ slug });

  // Query that triggers when lookupEmail is set
  const {
    data: registrations,
    isLoading,
    isError,
  } = api.registration.lookupByEmail.useQuery(
    {
      eventId: event?.id ?? "",
      email: lookupEmail ?? "",
    },
    {
      enabled: !!lookupEmail && !!event?.id,
    },
  );

  // Handle query results
  useEffect(() => {
    if (!lookupEmail) return;

    if (isError) {
      setError(
        "Unable to lookup your registration. Please try again or contact support.",
      );
      setLookupEmail(null);
      return;
    }

    if (registrations !== undefined) {
      if (registrations.length === 0) {
        setError(
          "No registrations found for this email address. Please check your email or register for the event.",
        );
        setLookupEmail(null);
        return;
      }

      // If found, redirect to the first registration's ticket management page
      const firstRegistration = registrations[0];
      if (firstRegistration) {
        router.push(`/events/${slug}/registrations/${firstRegistration.id}`);
      }
    }
  }, [registrations, isError, lookupEmail, router, slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!event?.id) {
      setError("Event not found. Please try again.");
      return;
    }

    // Trigger the lookup by setting the email
    setLookupEmail(email);
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Manage Your Tickets
        </h1>
        <p className="text-gray-600">
          {event?.name
            ? `Enter your email to access your tickets for ${event.name}`
            : "Enter your email to access your registration"}
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-900"
            >
              Email Address
            </label>
            <TextInput
              id="email"
              type="email"
              icon={HiMail}
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={isLoading}
            />
            <p className="mt-2 text-sm text-gray-500">
              Enter the email address you used when registering for this event
            </p>
          </div>

          {error && (
            <Alert color="failure" icon={HiInformationCircle}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Looking up..." : "Access My Tickets"}
          </Button>
        </form>

        <div className="mt-6 border-t pt-6">
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="flex">
              <div className="shrink-0">
                <HiInformationCircle className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-blue-800">
                  What you can do:
                </h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-700">
                  <li>View all tickets in your purchase</li>
                  <li>Assign tickets to different attendees</li>
                  <li>Download QR codes for event check-in</li>
                  <li>Update attendee information</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Don&apos;t have a registration yet?{" "}
          <a
            href={`/events/${slug}`}
            className="font-medium text-blue-600 hover:underline"
          >
            Register for this event
          </a>
        </p>
      </div>
    </div>
  );
}
