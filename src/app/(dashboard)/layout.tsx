import { Sidebar, SidebarInset } from "@/components/sidebar";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <SidebarInset>{children}</SidebarInset>
    </>
  );
}

export default DashboardLayout;
