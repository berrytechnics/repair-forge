"use client";

import TicketForm from "@/components/TicketForm";
import { useSearchParams } from "next/navigation";

export default function NewTicketPage() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customerId") || undefined;

  return <TicketForm customerId={customerId} />;
}
