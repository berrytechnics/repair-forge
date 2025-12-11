import InventoryModelForm from "@/components/InventoryModelForm";

export default function EditInventoryModelPage({
  params,
}: {
  params: { id: string };
}) {
  return <InventoryModelForm modelId={params.id} />;
}
