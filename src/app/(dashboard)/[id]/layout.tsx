/**
 * Event Dashboard Layout
 * Layout for event management with sidebar navigation
 */

import { api } from "@/trpc/server";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { AppSidebar, AppSidebarInset } from "@/components/app-sidebar";

interface EventDashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

async function DashboardLayout({ children, params }: EventDashboardLayoutProps) {
  const { id: eventId } = await params;
  const session = await auth();

  // Redirect to sign-in if not authenticated
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const event = await api.event.getById({ id: eventId });

  const navItems = [
    {
      href: `/${eventId}`,
      label: "Overview",
      icon: "AiFillDashboard",
    },
    {
      href: `/${eventId}/attendees`,
      label: "Attendees",
      icon: "HiUsers",
      count: event._count?.registrations,
    },
    {
      href: `/${eventId}/tickets`,
      label: "Tickets",
      icon: "HiTicket",
      count: event.ticketTypes?.length,
    },
    {
      href: `/${eventId}/schedule`,
      label: "Schedule",
      icon: "FaCalendarAlt",
      count: event._count?.scheduleEntries,
    },
    {
      href: `/${eventId}/speakers`,
      label: "Speakers",
      icon: "PiMicrophoneStageFill",
      count: event._count?.speakers,
    },
    {
      href: `/${eventId}/cfp`,
      label: "Call for Papers",
      icon: "RiMegaphoneFill",
    },
    {
      href: `/${eventId}/communications`,
      label: "Communications",
      icon: "HiChatBubbleLeftRight",
      count: event._count?.emailCampaigns,
    },
    {
      href: `/${eventId}/settings`,
      label: "Settings",
      icon: "RiSettings3Fill",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppSidebar menuItems={navItems} />
      <AppSidebarInset>{children}</AppSidebarInset>
    </div>
  );
}

export default DashboardLayout;
