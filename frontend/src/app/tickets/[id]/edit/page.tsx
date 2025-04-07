"use client";

import TicketForm from "@/components/TicketForm";

export default function EditTicketPage({ params }: { params: { id: string } }) {
  return <TicketForm ticketId={params.id} />;
}
