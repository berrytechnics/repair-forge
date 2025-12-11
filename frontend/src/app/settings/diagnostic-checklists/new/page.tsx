"use client";

import { useUser } from "@/lib/UserContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import LoadingSpinner from "@/components/LoadingSpinner";

const ChecklistTemplateForm = dynamic(
  () => import("@/components/ChecklistTemplateForm"),
  {
    ssr: false,
    loading: () => <LoadingSpinner text="Loading form..." />,
  }
);

export default function NewChecklistTemplatePage() {
  const router = useRouter();
  const { user, isLoading: userLoading, hasPermission } = useUser();

  useEffect(() => {
    if (
      !userLoading &&
      (!user || !hasPermission("settings.access") || user.role !== "admin")
    ) {
      router.push("/dashboard");
    }
  }, [user, userLoading, hasPermission, router]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/settings/diagnostic-checklists"
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-2 inline-block"
        >
          ← Back to Checklists
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Create Checklist Template
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Create a new diagnostic checklist template that can be assigned to
          tickets.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <ChecklistTemplateForm />
      </div>
    </div>
  );
}
