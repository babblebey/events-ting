/**
 * Event Dashboard Layout
 * Layout for event management with sidebar navigation
 * Filters navigation items based on team member permissions
 */

import { api } from "@/trpc/server";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { AppSidebar, AppSidebarInset } from "@/components/app-sidebar";
import { PermissionRevokedHandler } from "@/components/team/permission-revoked-handler";
import type { ModuleName } from "@/lib/validators";

interface EventDashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

// Module name mapping for navigation items
const MODULE_MAP: Record<string, ModuleName> = {
  overview: "OVERVIEW",
  attendees: "ATTENDEES",
  tickets: "TICKETS",
  schedule: "SCHEDULE",
  speakers: "SPEAKERS",
  cfp: "CFP",
  communications: "COMMUNICATIONS",
};

async function DashboardLayout({
  children,
  params,
}: EventDashboardLayoutProps) {
  const { id: eventId } = await params;
  const session = await auth();

  // Redirect to sign-in if not authenticated
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const event = await api.event.getById({ id: eventId });

  // Get current user's team membership to filter navigation
  const teamMember = await api.team.getCurrentMember({ eventId });

  // If user is not a team member, redirect to access denied
  if (!teamMember) {
    redirect(`/${eventId}/access-denied`);
  }

  // If user's access has been removed, redirect to removed page
  if (teamMember.status === "REMOVED") {
    redirect(`/${eventId}/removed`);
  }

  /**
   * Check if user has access to a specific module
   */
  const hasModuleAccess = (modulePath: string): boolean => {
    const moduleName = MODULE_MAP[modulePath];
    if (!moduleName) return true; // Unknown module, allow access

    // Owners have access to all modules
    if (teamMember.role === "OWNER") return true;

    // Collaborators need specific module permission
    return teamMember.modulePermissions.includes(moduleName);
  };

  // All navigation items
  const allNavItems = [
    {
      href: `/${eventId}`,
      label: "Overview",
      icon: "AiFillDashboard",
      module: "overview",
    },
    {
      href: `/${eventId}/attendees`,
      label: "Attendees",
      icon: "HiUsers",
      count: event._count?.registrations,
      module: "attendees",
    },
    {
      href: `/${eventId}/tickets`,
      label: "Tickets",
      icon: "HiTicket",
      count: event.ticketTypes?.length,
      module: "tickets",
    },
    {
      href: `/${eventId}/schedule`,
      label: "Schedule",
      icon: "FaCalendarAlt",
      count: event._count?.scheduleEntries,
      module: "schedule",
    },
    {
      href: `/${eventId}/speakers`,
      label: "Speakers",
      icon: "PiMicrophoneStageFill",
      count: event._count?.speakers,
      module: "speakers",
    },
    {
      href: `/${eventId}/cfp`,
      label: "Call for Papers",
      icon: "RiMegaphoneFill",
      module: "cfp",
    },
    {
      href: `/${eventId}/communications`,
      label: "Communications",
      icon: "HiChatBubbleLeftRight",
      count: event._count?.emailCampaigns,
      module: "communications",
    },
    {
      href: "",
      label: "Settings",
      icon: "RiSettings3Fill",
      children: [
        { label: "General", href: `/${eventId}/settings` },
        { label: "Team", href: `/${eventId}/settings/team` },
      ]
      // Settings is always visible (contains team management)
    },
  ];

  // Filter navigation items based on permissions
  const navItems = allNavItems.filter((item) => {
    // Settings is always accessible
    if (!item.module) return true;

    return hasModuleAccess(item.module);
  });

  return (
    <div className="min-h-screen">
      <AppSidebar menuItems={navItems} />
      <AppSidebarInset>
        <PermissionRevokedHandler eventId={eventId}>
          {children}
        </PermissionRevokedHandler>
      </AppSidebarInset>
    </div>
  );
}

export default DashboardLayout;
