/**
 * Dashboard Header Component
 * Displays page title, description, create event button, and user profile dropdown
 * Phase 5: Dashboard Header & Actions
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "flowbite-react";
import { HiPlus, HiUser, HiLogout, HiChevronDown } from "react-icons/hi";

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface DashboardHeaderProps {
  /** User session data */
  user: User;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Dashboard header with title, description, create button, and user menu
 */
export function DashboardHeader({ user, className = "" }: DashboardHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSignOut = () => {
    window.location.href = "/api/auth/signout";
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Close dropdown when clicking outside
  const handleClickOutside = () => {
    setIsDropdownOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 ${className}`}
    >
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          {/* Title and Description */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              My Events
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage all your events in one place
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Create Event Button */}
            <Link href="/create-event">
              <Button color="blue" size="lg">
                <HiPlus className="mr-2 h-5 w-5" />
                <span className="hidden sm:inline">Create Event</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </Link>

            {/* User Profile Dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={toggleDropdown}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  onBlur={handleClickOutside}
                >
                  {/* User Avatar/Icon */}
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name ?? "User"}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                      <HiUser className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                    </div>
                  )}
                  <span className="hidden md:inline">
                    {user.name ?? "User"}
                  </span>
                  <HiChevronDown
                    className={`h-4 w-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking inside
                  >
                    {/* User Info Header */}
                    <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-600">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.name ?? "User"}
                      </div>
                      <div className="truncate text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <HiUser className="h-4 w-4" />
                        Profile
                      </Link>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-gray-200 py-1 dark:border-gray-600">
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
                      >
                        <HiLogout className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
