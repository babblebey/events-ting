"use client";

import { useEffect, useRef, useState } from "react";
import type { FC, SVGProps } from "react";
import { BiBuoy } from "react-icons/bi";
import { HiViewBoards, HiMenu, HiX } from "react-icons/hi";
import { FaCalendarAlt } from "react-icons/fa";
import { RiMegaphoneFill, RiSettings3Fill } from "react-icons/ri";
import { AiFillDashboard } from "react-icons/ai";
import { PiMicrophoneStageFill } from "react-icons/pi";
import { HiTicket, HiChatBubbleLeftRight, HiUsers } from "react-icons/hi2";
import {
  Sidebar as FlowbiteSidebar,
  SidebarItem,
  SidebarItemGroup,
  SidebarItems,
  SidebarCollapse,
} from "flowbite-react";

// Icon mapping for string-based icon references
const iconMap: Record<string, FC<SVGProps<SVGSVGElement>>> = {
  AiFillDashboard,
  HiUsers,
  HiTicket,
  FaCalendarAlt,
  PiMicrophoneStageFill,
  RiMegaphoneFill,
  HiChatBubbleLeftRight,
  RiSettings3Fill,
  HiViewBoards,
  BiBuoy,
};

interface AppSidebarProps {
  menuItems?: AppSidebarMenuItem[];
  footerItems?: AppSidebarMenuItem[];
  defaultOpen?: boolean;
}

interface AppSidebarMenuItem {
  label: string;
  href: string;
  icon?: string;
  children?: Array<{
    label: string;
    href: string;
  }>;
  count?: number;
}

const defaultFooterItems: AppSidebarMenuItem[] = [
  // { label: "Upgrade to Pro", href: "#", icon: "HiChartPie" },
  { label: "Documentation", href: "#", icon: "HiViewBoards" },
  { label: "Help", href: "#", icon: "BiBuoy" },
];

function AppSidebar({
  menuItems,
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
      <AppSidebarToggle
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
      <aside ref={sidebarRef}>
        <FlowbiteSidebar
          id="app-sidebar"
          aria-label="Application sidebar"
          className={`fixed top-0 left-0 z-40 h-screen w-72 transition-transform border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          } sm:translate-x-0`}
        >
          {
          // WIP - DEFFERED
          /* <div className="border-b">
            <h5 id="drawer-navigation-label" className="text-base font-semibold text-gray-500 uppercase dark:text-gray-400">Menu</h5>
            <button 
              type="button" 
              data-drawer-hide="drawer-navigation" 
              aria-controls="drawer-navigation" 
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 absolute top-2.5 end-2.5 inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white" 
              onClick={() => setIsOpen(!isOpen)}
            >
              <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
              <span className="sr-only">Close menu</span>
            </button>
          </div> */}
          <SidebarItems className="flex h-full flex-col">
            <SidebarItemGroup>
              {menuItems?.map((item) => {
                const IconComponent = item.icon ? iconMap[item.icon] : undefined;
                return item.children ? (
                  <SidebarCollapse
                    key={item.href}
                    icon={IconComponent}
                    label={item.label}
                  >
                    {item.children.map((child) => (
                      <SidebarItem key={child.href} href={child.href}>
                        {child.label}
                      </SidebarItem>
                    ))}
                  </SidebarCollapse>
                ) : (
                  <SidebarItem key={item.href} href={item.href} icon={IconComponent} className="flex justify-between">
                    <span>{item.label}</span>
                    {/* {item.count !== undefined && (
                      <span className="inline-flex items-center justify-center w-3 h-3 p-3 text-sm font-medium text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-300">
                        {item.count}
                      </span>
                    )} */}
                  </SidebarItem>
                );
              })}
            </SidebarItemGroup>
            {footerItems && footerItems.length > 0 && (
              <SidebarItemGroup className="mt-auto">
                {footerItems.map((item) => {
                  const IconComponent = item.icon ? iconMap[item.icon] : undefined;
                  return (
                    <SidebarItem key={`footer-${item.label}`} href={item.href} icon={IconComponent}>
                      {item.label}
                    </SidebarItem>
                  );
                })}
              </SidebarItemGroup>
            )}
          </SidebarItems>
        </FlowbiteSidebar>
      </aside>
    </>
  );
}

interface AppSidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  ariaControls?: string;
}

function AppSidebarToggle({
  isOpen,
  onToggle,
  className = "",
  ariaControls = "sidebar",
}: AppSidebarToggleProps) {
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

function AppSidebarInset({ children }: { children: React.ReactNode }) {
  return <main className="p-4 sm:ml-72">{children}</main>;
}

export { AppSidebar, AppSidebarToggle, AppSidebarInset };
