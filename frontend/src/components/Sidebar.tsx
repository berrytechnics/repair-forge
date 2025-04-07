"use client";

// components/Sidebar.tsx
import { cn } from "@/lib/utils";
import {
  Bars3Icon,
  ChartBarIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ShoppingBagIcon,
  TicketIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-gray-100 dark:hover:bg-gray-800",
        active
          ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
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
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

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

  return (
    <>
      {/* Mobile hamburger menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md text-gray-500 hover:text-gray-900 focus:outline-none bg-white shadow"
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

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-64 border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full py-6 px-3">
          {/* Logo */}
          <div className="px-3 mb-6">
            <h1 className="font-bold text-xl">Repair Manager</h1>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 flex-1">
            {navigation.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={pathname.includes(item.href)}
              />
            ))}
          </nav>

          {/* User profile */}
          <div className="mt-auto pt-4 border-t border-gray-200">
            <div className="flex items-center px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <UsersIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-gray-500">admin@repairmanager.com</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
