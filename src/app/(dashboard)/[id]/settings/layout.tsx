/**
 * Settings Layout
 * Layout with tab navigation for event settings sections
 */

"use client";

import { use } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface SettingsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default function SettingsLayout({
  children,
  params,
}: SettingsLayoutProps) {
  const { id: eventId } = use(params);
  const pathname = usePathname();

  const tabs = [
    {
      name: "General",
      href: `/${eventId}/settings`,
    },
    {
      name: "Team",
      href: `/${eventId}/settings/team`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Settings tabs">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`
                  whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                  ${
                    isActive
                      ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }
                `}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>{children}</div>
    </div>
  );
}
