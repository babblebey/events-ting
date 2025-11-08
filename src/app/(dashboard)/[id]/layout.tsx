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
  params: { id: string };
}

async function DashboardLayout({ children, params }: EventDashboardLayoutProps) {
  const session = await auth();

  // Redirect to sign-in if not authenticated
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const event = await api.event.getById({ id: params.id });

  const navItems = [
    {
      href: `/${params.id}`,
      label: "Overview",
      icon: "AiFillDashboard",
    },
    {
      href: `/${params.id}/attendees`,
      label: "Attendees",
      icon: "HiUsers",
      count: event._count?.registrations,
    },
    {
      href: `/${params.id}/tickets`,
      label: "Tickets",
      icon: "HiTicket",
      count: event.ticketTypes?.length,
    },
    {
      href: `/${params.id}/schedule`,
      label: "Schedule",
      icon: "FaCalendarAlt",
      count: event._count?.scheduleEntries,
    },
    {
      href: `/${params.id}/speakers`,
      label: "Speakers",
      icon: "GiPublicSpeaker",
      count: event._count?.speakers,
    },
    {
      href: `/${params.id}/cfp`,
      label: "Call for Papers",
      icon: "RiMegaphoneFill",
    },
    {
      href: `/${params.id}/communications`,
      label: "Communications",
      icon: "HiChatBubbleLeftRight",
      count: event._count?.emailCampaigns,
    },
    {
      href: `/${params.id}/settings`,
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
