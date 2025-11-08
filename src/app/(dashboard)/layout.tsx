/**
 * Dashboard Layout
 * Protected layout requiring authentication
 */

import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { Sidebar, SidebarInset } from "@/components/sidebar";

async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Redirect to sign-in if not authenticated
  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <>
      <Sidebar />
      <SidebarInset>{children}</SidebarInset>
    </>
  );
}

export default DashboardLayout;
