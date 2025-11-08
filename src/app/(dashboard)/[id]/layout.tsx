/**
 * Event Dashboard Layout
 * Layout for event management with sidebar navigation
 */

import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import Link from "next/link";
import { Button } from "flowbite-react";
import {
  LayoutDashboard,
  Users,
  Ticket,
  Calendar,
  Mic,
  Mail,
  Settings,
  FileText,
  ArrowLeft,
} from "lucide-react";

interface EventDashboardLayoutProps {
  children: React.ReactNode;
  params: { id: string };
}

export default async function EventDashboardLayout({
  children,
  params,
}: EventDashboardLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const event = await api.event.getById({ id: params.id });

  const navItems = [
    {
      href: `/(dashboard)/${params.id}`,
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      href: `/(dashboard)/${params.id}/attendees`,
      label: "Attendees",
      icon: Users,
      count: event._count?.registrations,
    },
    {
      href: `/(dashboard)/${params.id}/tickets`,
      label: "Tickets",
      icon: Ticket,
      count: event.ticketTypes?.length,
    },
    {
      href: `/(dashboard)/${params.id}/schedule`,
      label: "Schedule",
      icon: Calendar,
      count: event._count?.scheduleEntries,
    },
    {
      href: `/(dashboard)/${params.id}/speakers`,
      label: "Speakers",
      icon: Mic,
      count: event._count?.speakers,
    },
    {
      href: `/(dashboard)/${params.id}/cfp`,
      label: "Call for Papers",
      icon: FileText,
    },
    {
      href: `/(dashboard)/${params.id}/communications`,
      label: "Communications",
      icon: Mail,
      count: event._count?.emailCampaigns,
    },
    {
      href: `/(dashboard)/${params.id}/settings`,
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <Link href="/(dashboard)">
              <Button size="sm" color="gray" className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                All Events
              </Button>
            </Link>
            <h2 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
              {event.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {event.status}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center justify-between rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    {item.count !== undefined && (
                      <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                        {item.count}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Quick Actions */}
          <div className="border-t border-gray-200 p-4 dark:border-gray-700">
            <Link href={`/events/${event.slug}`}>
              <Button size="sm" color="gray" className="w-full">
                View Public Page
              </Button>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
