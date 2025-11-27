"use client";

// components/Sidebar.tsx
import { logout } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { cn } from "@/lib/utils";
import {
  ArrowRightEndOnRectangleIcon,
  Bars3Icon,
  ChartBarIcon,
  ClipboardDocumentIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  MoonIcon,
  ShoppingBagIcon,
  SunIcon,
  TicketIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

const SidebarLink = ({ href, icon, label, active }: SidebarLinkProps) => {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-blue-100 dark:hover:bg-gray-800",
        active
          ? "bg-blue-100 text-gray-900 dark:bg-blue-800 dark:text-gray-50"
          : "text-gray-500 dark:text-gray-400"
      )}
    >
      <div className="w-6 h-6">{icon}</div>
      <span>{label}</span>
    </Link>
  );
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { user, isLoading, setUser } = useUser();
  const { theme, toggleTheme } = useTheme();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleLogout = () => {
    logout();
    setUser(null);
    router.push("/login");
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return "?";
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  };

  const navigation = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <ChartBarIcon className="w-6 h-6" />,
    },
    {
      href: "/tickets",
      label: "Tickets",
      icon: <TicketIcon className="w-6 h-6" />,
    },
    {
      href: "/customers",
      label: "Customers",
      icon: <UsersIcon className="w-6 h-6" />,
    },
    {
      href: "/inventory",
      label: "Inventory",
      icon: <ShoppingBagIcon className="w-6 h-6" />,
    },
    {
      href: "/purchase-orders",
      label: "Purchase Orders",
      icon: <ClipboardDocumentIcon className="w-6 h-6" />,
    },
    {
      href: "/invoices",
      label: "Invoices",
      icon: <DocumentTextIcon className="w-6 h-6" />,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: <Cog6ToothIcon className="w-6 h-6" />,
    },
  ];

  // If no user is logged in, just display login/register links
  if (!isLoading && !user) {
    return (
      <>
        {/* Mobile hamburger menu button */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none bg-white dark:bg-gray-900 shadow"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-gray-800/50 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Minimal sidebar with auth links */}
        <aside
          className={cn(
            "fixed top-0 left-0 z-40 h-screen w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <div className="flex flex-col h-full py-6 px-3">
            {/* Logo */}
            <div className="px-3 mb-6">
              <h1 className="font-bold text-xl dark:text-gray-100">Repair Manager</h1>
            </div>

            <div className="flex flex-col flex-1 items-center justify-center space-y-4 px-3">
              <p className="text-gray-600 text-center">
                Please log in to access the repair management system
              </p>

              <Link
                href="/login"
                className="w-full px-4 py-2 text-center bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="w-full px-4 py-2 text-center border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Register
              </Link>
            </div>
          </div>
        </aside>
      </>
    );
  }

  // Show loading state during initial load
  if (isLoading) {
    return (
      <aside className="fixed top-0 left-0 z-40 h-screen w-64 border-r border-gray-200 bg-white">
        <div className="flex flex-col h-full items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-sm text-gray-500">Loading...</p>
        </div>
      </aside>
    );
  }

  // Full sidebar for logged-in users
  return (
    <>
      {/* Mobile hamburger menu button */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none bg-white dark:bg-gray-900 shadow"
          >
            {isOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>
        </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-800/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Full sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full py-6 px-3">
          {/* Logo */}
          <div className="px-3 mb-6">
            <h1 className="font-bold text-xl dark:text-gray-100">Repair Manager</h1>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 flex-1">
            {navigation.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                }
              />
            ))}
          </nav>

          {/* User profile */}
          <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="px-3">
              <div className="flex items-center py-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {getUserInitials()}
                  </span>
                </div>
                <div className="ml-3 overflow-hidden">
                  <p className="text-sm font-medium truncate dark:text-gray-100">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user?.role}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="w-full mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {theme === "dark" ? (
                  <>
                    <SunIcon className="w-5 h-5" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <MoonIcon className="w-5 h-5" />
                    <span>Dark Mode</span>
                  </>
                )}
              </button>
              <button
                onClick={handleLogout}
                className="w-full mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <ArrowRightEndOnRectangleIcon className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
