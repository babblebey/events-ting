/**
 * Module Permissions Selector Component
 *
 * Checkbox-based selector for assigning module permissions to collaborators.
 * Displays available modules with descriptions to help organizers understand
 * what access they're granting.
 *
 * @module components/team/module-permissions-selector
 */

"use client";

import { Checkbox, Label } from "flowbite-react";
import { MODULE_NAMES, type ModuleName } from "@/lib/validators";

interface ModulePermissionsSelectorProps {
  selectedModules: ModuleName[];
  onChange: (modules: ModuleName[]) => void;
  disabled?: boolean;
  error?: string;
}

const MODULE_INFO: Record<ModuleName, { label: string; description: string }> =
  {
    OVERVIEW: {
      label: "Overview",
      description: "View event dashboard and basic statistics",
    },
    ATTENDEES: {
      label: "Attendees",
      description: "View and manage event registrations and attendee data",
    },
    TICKETS: {
      label: "Tickets",
      description: "Create and manage ticket types and pricing",
    },
    SCHEDULE: {
      label: "Schedule",
      description: "Create and edit event schedule entries",
    },
    SPEAKERS: {
      label: "Speakers",
      description: "Add and manage speaker profiles",
    },
    CFP: {
      label: "Call for Papers",
      description: "Manage CFP settings and review submissions",
    },
    COMMUNICATIONS: {
      label: "Communications",
      description: "Create and send email campaigns to attendees",
    },
  };

export function ModulePermissionsSelector({
  selectedModules,
  onChange,
  disabled = false,
  error,
}: ModulePermissionsSelectorProps) {
  const handleToggle = (module: ModuleName) => {
    if (disabled) return;

    const isSelected = selectedModules.includes(module);
    if (isSelected) {
      // Remove module
      onChange(selectedModules.filter((m) => m !== module));
    } else {
      // Add module
      onChange([...selectedModules, module]);
    }
  };

  return (
    <div
      className="space-y-3"
      role="group"
      aria-label="Module permissions selection"
    >
      <div className="space-y-2" role="list" aria-label="Available modules">
        {MODULE_NAMES.map((module) => {
          const info = MODULE_INFO[module];
          const isSelected = selectedModules.includes(module);

          return (
            <div
              key={module}
              data-module={module}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors sm:p-4 ${
                isSelected
                  ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
                  : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-blue-200 dark:hover:border-blue-800"} `}
              onClick={() => handleToggle(module)}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" ||
                  e.key === " " ||
                  e.key === "Spacebar"
                ) {
                  e.preventDefault();
                  handleToggle(module);
                }
                // Allow arrow keys to navigate between module cards
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const currentIndex = MODULE_NAMES.indexOf(module);
                  const nextIndex =
                    e.key === "ArrowDown"
                      ? (currentIndex + 1) % MODULE_NAMES.length
                      : (currentIndex - 1 + MODULE_NAMES.length) %
                        MODULE_NAMES.length;
                  const nextModule = MODULE_NAMES[nextIndex];
                  const nextElement = document.querySelector(
                    `[data-module="${nextModule}"]`,
                  );
                  (nextElement as HTMLElement | null)?.focus();
                }
              }}
              aria-label={`${info?.label ?? module}. ${info?.description ?? ""}. ${isSelected ? "Selected" : "Not selected"}`}
            >
              <div className="pt-0.5">
                <Checkbox
                  id={`module-${module}`}
                  checked={isSelected}
                  onChange={() => handleToggle(module)}
                  disabled={disabled}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="min-w-0 flex-1">
                <Label
                  htmlFor={`module-${module}`}
                  className="cursor-pointer text-sm font-medium text-gray-900 sm:text-base dark:text-white"
                >
                  {info?.label ?? module}
                </Label>
                <p className="mt-1 text-xs text-gray-600 sm:text-sm dark:text-gray-400">
                  {info?.description ?? ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Help text */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Select at least one module. Settings module is reserved for event owners
        only.{" "}
        <span className="text-xs">
          Use arrow keys to navigate, Space or Enter to select.
        </span>
      </p>

      {/* Selected count indicator */}
      {selectedModules.length > 0 && (
        <div
          className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="font-medium">Selected:</span>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            {selectedModules.length}{" "}
            {selectedModules.length === 1 ? "module" : "modules"}
          </span>
        </div>
      )}
    </div>
  );
}
