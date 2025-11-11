/**
 * User Events Dashboard Page
 * Main landing page for authenticated users showing all their managed events
 */

import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import { EventsDashboard } from "@/components/dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Events | Events Ting",
  description: "Manage all your events in one place",
};

interface DashboardPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await auth();

  // Redirect to sign-in if not authenticated
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const params = await searchParams;
  const statusFilter = params.status as "draft" | "published" | "archived" | undefined;

  // Fetch initial events (first 20) for the authenticated user
  const initialEvents = await api.event.list({
    organizerId: session.user.id,
    status: statusFilter,
    limit: 20,
  });

  return <EventsDashboard initialEvents={initialEvents} />;
}
