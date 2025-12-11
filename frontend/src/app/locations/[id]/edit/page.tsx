"use client";

import { useUser } from "@/lib/UserContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import LoadingSpinner from "@/components/LoadingSpinner";

const LocationForm = dynamic(() => import("@/components/LocationForm"), {
  ssr: false,
  loading: () => <LoadingSpinner text="Loading form..." />,
});

export default function EditLocationPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  // Check if user is admin
  useEffect(() => {
    if (!userLoading && (!user || user.role !== "admin")) {
      router.push("/dashboard");
    }
  }, [user, userLoading, router]);

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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Edit Location</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <LocationForm locationId={params.id} />
      </div>
    </div>
  );
}
