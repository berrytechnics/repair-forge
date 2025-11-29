"use client";

// components/Sidebar.tsx
import { logout } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { cn } from "@/lib/utils";
import {
    ArrowPathIcon,
    ArrowRightEndOnRectangleIcon,
    Bars3Icon,
    ChartBarIcon,
    ClipboardDocumentIcon,
    Cog6ToothIcon,
    DocumentTextIcon,
    MoonIcon,
    ShoppingBagIcon,
    Squares2X2Icon,
    SunIcon,
    TicketIcon,
    UsersIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import LocationSwitcher from "./LocationSwitcher";

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
  const { user, isLoading, setUser, hasPermission } = useUser();
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

  // Define all navigation items with their required permissions
  interface NavigationItem {
    href: string;
    label: string;
    icon: React.ReactNode;
    permission: string;
    adminOnly?: boolean;
  }

  const allNavigationItems: NavigationItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <Squares2X2Icon className="w-6 h-6" />,
      permission: "settings.access", // All authenticated users have this
    },
    {
      href: "/tickets",
      label: "Tickets",
      icon: <TicketIcon className="w-6 h-6" />,
      permission: "tickets.read",
    },
    {
      href: "/customers",
      label: "Customers",
      icon: <UsersIcon className="w-6 h-6" />,
      permission: "customers.read",
    },
    {
      href: "/inventory",
      label: "Inventory",
      icon: <ShoppingBagIcon className="w-6 h-6" />,
      permission: "inventory.read",
    },
    {
      href: "/inventory-transfers",
      label: "Inventory Transfers",
      icon: <ArrowPathIcon className="w-6 h-6" />,
      permission: "inventoryTransfers.read",
    },
    {
      href: "/purchase-orders",
      label: "Purchase Orders",
      icon: <ClipboardDocumentIcon className="w-6 h-6" />,
      permission: "purchaseOrders.read",
    },
    {
      href: "/invoices",
      label: "Invoices",
      icon: <DocumentTextIcon className="w-6 h-6" />,
      permission: "invoices.read",
    },
    {
      href: "/reporting",
      label: "Reports",
      icon: <ChartBarIcon className="w-6 h-6" />,
      permission: "settings.access", // All authenticated users have this
    },
    {
      href: "/settings",
      label: "Settings",
      icon: <Cog6ToothIcon className="w-6 h-6" />,
      permission: "settings.access",
    },
  ];

  // Filter navigation based on user permissions
  const navigation = allNavigationItems.filter((item) => {
    if (!user) return false;
    // Check admin-only items
    if (item.adminOnly && user.role !== "admin") {
      return false;
    }
    return hasPermission(item.permission);
  });

  // Hide sidebar completely when user is not logged in
  if (!isLoading && !user) {
    return null;
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
            {navigation.map((item) => {
              // Settings should be active for /settings, /settings/*, and /locations pages
              const isActive = item.href === "/settings"
                ? pathname === item.href || 
                  pathname.startsWith(`${item.href}/`) || 
                  pathname === "/locations" ||
                  pathname.startsWith("/locations/")
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              
              return (
                <SidebarLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={isActive}
                />
              );
            })}
          </nav>

          {/* Location Switcher */}
          {user && (
            <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="px-3 py-2">
                <LocationSwitcher />
              </div>
            </div>
          )}

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
