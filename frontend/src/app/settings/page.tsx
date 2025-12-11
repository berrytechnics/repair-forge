"use client";

import { useUser } from "@/lib/UserContext";
import {
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  EnvelopeIcon,
  FlagIcon,
  MapPinIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  UsersIcon,
  TagIcon,
  Squares2X2Icon,
  BuildingStorefrontIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const { user, hasPermission, isLoading, isSuperuser } = useUser();

  // Check if user has permission to access settings
  useEffect(() => {
    if (!isLoading && (!user || !hasPermission("settings.access"))) {
      router.push("/dashboard");
    }
  }, [user, isLoading, hasPermission, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !hasPermission("settings.access")) {
    return null;
  }

  const settingsItems = [
    {
      name: "Users",
      description: "Manage user accounts, roles, and access",
      href: "/settings/users",
      icon: UsersIcon,
      permission: "settings.access",
      adminOnly: true,
    },
    {
      name: "Permissions",
      description: "View role-based permissions matrix",
      href: "/settings/permissions",
      icon: ShieldCheckIcon,
      permission: "permissions.view",
    },
    {
      name: "Diagnostic Checklists",
      description: "Create and manage diagnostic checklist templates",
      href: "/settings/diagnostic-checklists",
      icon: ClipboardDocumentCheckIcon,
      permission: "settings.access",
      adminOnly: true,
    },
    {
      name: "Locations",
      description: "Manage business locations",
      href: "/locations",
      icon: MapPinIcon,
      permission: "settings.access",
      adminOnly: true,
    },
    {
      name: "Email Integration",
      description: "Configure email service for automated notifications",
      href: "/settings/integrations/email",
      icon: EnvelopeIcon,
      permission: "settings.access",
      adminOnly: true,
    },
    {
      name: "Payment Integration",
      description: "Configure payment processing for invoices",
      href: "/settings/integrations/payment",
      icon: CreditCardIcon,
      permission: "payments.configure",
      adminOnly: true,
    },
    {
      name: "Feature Flags",
      description: "Enable or disable features for your organization",
      href: "/settings/feature-flags",
      icon: FlagIcon,
      permission: "settings.access",
      adminOnly: true,
    },
    {
      name: "Superuser Settings",
      description: "View system as any tenant and manage tenant access",
      href: "/settings/superuser",
      icon: UserCircleIcon,
      permission: "settings.access",
      superuserOnly: true,
    },
    {
      name: "Inventory Categories",
      description: "Manage inventory categories",
      href: "/settings/inventory-categories",
      icon: TagIcon,
      permission: "inventory.categories.read",
      adminOnly: true,
    },
    {
      name: "Inventory Subcategories",
      description: "Manage inventory subcategories",
      href: "/settings/inventory-subcategories",
      icon: Squares2X2Icon,
      permission: "inventory.subcategories.read",
      adminOnly: true,
    },
    {
      name: "Inventory Brands",
      description: "Manage inventory brands",
      href: "/settings/inventory-brands",
      icon: BuildingStorefrontIcon,
      permission: "inventory.brands.read",
      adminOnly: true,
    },
    {
      name: "Inventory Models",
      description: "Manage inventory models",
      href: "/settings/inventory-models",
      icon: CpuChipIcon,
      permission: "inventory.models.read",
      adminOnly: true,
    },
  ];

  const availableSettings = settingsItems.filter((item) => {
    if (!user) return false;
    // Check superuser-only items
    if ((item as { superuserOnly?: boolean }).superuserOnly && !isSuperuser) {
      return false;
    }
    // Check admin-only items
    if (item.adminOnly && user.role !== "admin") {
      return false;
    }
    return hasPermission(item.permission);
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your application settings and preferences
        </p>
      </div>

      <div className="grid gap-4">
        {availableSettings.length > 0 ? (
          availableSettings.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="block bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {item.description}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
              No settings available
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              You don&apos;t have access to any settings at this time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
