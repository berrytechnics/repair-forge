import InventoryBrandForm from "@/components/InventoryBrandForm";

export default function EditInventoryBrandPage({
  params,
}: {
  params: { id: string };
}) {
  return <InventoryBrandForm brandId={params.id} />;
}
