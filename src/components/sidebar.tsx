"use client";

import { useEffect, useRef, useState } from "react";
import type { FC, SVGProps } from "react";
import { BiBuoy } from "react-icons/bi";
import { FaCalendarAlt } from "react-icons/fa";
import { RiMegaphoneFill } from "react-icons/ri";
import { AiFillDashboard } from "react-icons/ai";
import { HiTicket, HiChatBubbleLeftRight, HiUsers } from "react-icons/hi2";
import { HiInbox, HiTable, HiViewBoards, HiMenu, HiX } from "react-icons/hi";
import {
  Sidebar as FlowbiteSidebar,
  SidebarItem,
  SidebarItemGroup,
  SidebarItems,
  SidebarCollapse,
} from "flowbite-react";

interface AppSidebarProps {
  menuItems?: SidebarMenuItem[];
  footerItems?: SidebarMenuItem[];
  defaultOpen?: boolean;
}

const defaultMenuItems: SidebarMenuItem[] = [
  { label: "Dashboard", href: "#", icon: AiFillDashboard },
  { label: "Tickets", href: "#", icon: HiTicket },
  { label: "Orders", href: "#", icon: HiInbox },
  { label: "Attendees", href: "#", icon: HiUsers },
  {
    label: "Call For Papers (CFP)",
    href: "#",
    icon: RiMegaphoneFill,
    children: [
      { label: "Forms", href: "#" },
      { label: "Applications", href: "#" },
    ],
  },
  { label: "Speakers", href: "#", icon: HiTable },
  { label: "Schedule", href: "#", icon: FaCalendarAlt },
  { label: "Communications", href: "#", icon: HiChatBubbleLeftRight },
];

const defaultFooterItems: SidebarMenuItem[] = [
  // { label: "Upgrade to Pro", href: "#", icon: HiChartPie },
  { label: "Documentation", href: "#", icon: HiViewBoards },
  { label: "Help", href: "#", icon: BiBuoy },
];

function Sidebar({
  menuItems = defaultMenuItems,
  footerItems = defaultFooterItems,
  defaultOpen = false,
}: AppSidebarProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        isOpen &&
        window.innerWidth < 640 // Only on mobile
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    const handleRouteChange = () => {
      if (window.innerWidth < 640) {
        setIsOpen(false);
      }
    };

    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  return (
    <>
      {/* Toggle Button */}
      <SidebarToggle
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        ariaControls="app-sidebar"
      />

      {/* Backdrop Overlay (Mobile only) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/50 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div ref={sidebarRef}>
        <FlowbiteSidebar
          id="app-sidebar"
          aria-label="Application sidebar"
          className={`fixed top-0 left-0 z-40 h-screen w-72 transition-transform ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          } sm:translate-x-0`}
        >
          <SidebarItems className="flex h-full flex-col">
            <SidebarItemGroup>
              {menuItems.map((item, index) =>
                item.children ? (
                  <SidebarCollapse
                    key={index}
                    icon={item.icon}
                    label={item.label}
                  >
                    {item.children.map((child, childIndex) => (
                      <SidebarItem key={childIndex} href={child.href}>
                        {child.label}
                      </SidebarItem>
                    ))}
                  </SidebarCollapse>
                ) : (
                  <SidebarItem key={index} href={item.href} icon={item.icon}>
                    {item.label}
                  </SidebarItem>
                ),
              )}
            </SidebarItemGroup>
            {footerItems && footerItems.length > 0 && (
              <SidebarItemGroup className="mt-auto">
                {footerItems.map((item, index) => (
                  <SidebarItem key={index} href={item.href} icon={item.icon}>
                    {item.label}
                  </SidebarItem>
                ))}
              </SidebarItemGroup>
            )}
          </SidebarItems>
        </FlowbiteSidebar>
      </div>
    </>
  );
}

interface SidebarMenuItem {
  label: string;
  href: string;
  icon: FC<SVGProps<SVGSVGElement>>;
  children?: Array<{
    label: string;
    href: string;
  }>;
}

interface SidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  ariaControls?: string;
}

function SidebarToggle({
  isOpen,
  onToggle,
  className = "",
  ariaControls = "sidebar",
}: SidebarToggleProps) {
  return (
    <button
      onClick={onToggle}
      type="button"
      className={`fixed top-4 left-4 z-50 inline-flex items-center rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-100 focus:ring-2 focus:ring-gray-200 focus:outline-none sm:hidden dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600 ${className}`}
      aria-controls={ariaControls}
      aria-expanded={isOpen}
      aria-label="Toggle sidebar"
    >
      <span className="sr-only">Toggle sidebar</span>
      {isOpen ? (
        <HiX className="h-6 w-6" aria-hidden="true" />
      ) : (
        <HiMenu className="h-6 w-6" aria-hidden="true" />
      )}
    </button>
  );
}

function SidebarInset({ children }: { children: React.ReactNode }) {
  return <div className="p-4 sm:ml-72">{children}</div>;
}

export { Sidebar, SidebarToggle, SidebarInset };
