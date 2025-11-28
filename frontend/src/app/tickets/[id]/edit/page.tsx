"use client";

import TicketForm from "@/components/TicketForm";
import { useUser } from "@/lib/UserContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EditTicketPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, hasPermission, isLoading } = useUser();

  // Check if user has permission to access this page
  useEffect(() => {
    if (!isLoading && (!user || !hasPermission("tickets.update"))) {
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

  if (!user || !hasPermission("tickets.update")) {
    return null;
  }

  return <TicketForm ticketId={params.id} />;
}
