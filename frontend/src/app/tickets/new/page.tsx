"use client";

import TicketForm from "@/components/TicketForm";
import { useUser } from "@/lib/UserContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

export default function NewTicketPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewTicketClientPage />
    </Suspense>
  );
}

function NewTicketClientPage() {
  const router = useRouter();
  const { user, hasPermission, isLoading } = useUser();
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customerId") || undefined;

  // Check if user has permission to access this page
  useEffect(() => {
    if (!isLoading && (!user || !hasPermission("tickets.create"))) {
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

  if (!user || !hasPermission("tickets.create")) {
    return null;
  }

  return <TicketForm customerId={customerId} />;
}
