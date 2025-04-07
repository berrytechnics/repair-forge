"use client";

import CustomerForm from "@/components/CustomerForm";

export default function EditCustomerPage({
  params,
}: {
  params: { id: string };
}) {
  return <CustomerForm customerId={params.id} />;
}
