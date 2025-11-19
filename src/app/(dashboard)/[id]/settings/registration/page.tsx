/**
 * Event Registration Settings Page
 * Configure custom registration fields for attendee information collection
 */

import { api } from "@/trpc/server";
import { Card } from "flowbite-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CustomFieldBuilder } from "@/components/events/custom-field-builder";
import { HiInformationCircle } from "react-icons/hi";

interface RegistrationSettingsPageProps {
  params: { id: string };
}

export default async function RegistrationSettingsPage({
  params,
}: RegistrationSettingsPageProps) {
  const event = await api.event.getById({ id: params.id });

  // Parse custom fields from event.customData if exists
  // TODO: Once Event.customFields is added to schema, use that instead
  const existingCustomFields: unknown[] = [];
  // Temporarily disabled until Event schema has customData field
  // if (event.customData && typeof event.customData === 'object') {
  //   const customData = event.customData as Record<string, unknown>;
  //   if (Array.isArray(customData.customFields)) {
  //     existingCustomFields = customData.customFields;
  //   }
  // }

  return (
    <div className="space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: event.name, href: `/${params.id}` },
          { label: "Settings", href: `/${params.id}/settings` },
          { label: "Registration" },
        ]}
      />

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Registration Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure custom registration fields to collect attendee information
        </p>
      </div>

      {/* Info Banner */}
      <Card>
        <div className="flex items-start gap-3">
          <HiInformationCircle className="mt-1 h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              About Custom Fields
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Custom fields allow you to collect specific information from attendees during
              ticket assignment. Examples include dietary restrictions, t-shirt sizes,
              accessibility needs, or session preferences.
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>Fields are shown when buyers assign tickets to attendees</li>
              <li>Required fields must be completed before assignment</li>
              <li>Responses are stored per attendee and can be exported</li>
              <li>You can add, edit, or remove fields at any time</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Custom Field Builder */}
      <Card>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Custom Registration Fields
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Add and configure custom fields for your event registration
          </p>
        </div>
        <CustomFieldBuilder
          eventId={params.id}
          initialFields={existingCustomFields}
        />
      </Card>

      {/* Field Types Reference */}
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Available Field Types
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Short Text
            </h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Single-line text input for brief responses (e.g., company name, job title)
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Long Text
            </h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Multi-line text area for detailed responses (e.g., special requests, bio)
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Dropdown
            </h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Select one option from a predefined list (e.g., dietary restrictions, t-shirt size)
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Radio Buttons
            </h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Choose one option from visible list (e.g., yes/no, experience level)
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Checkboxes
            </h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Select multiple options from a list (e.g., session interests, accessibility needs)
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
