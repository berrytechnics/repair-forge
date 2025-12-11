import InventorySubcategoryForm from "@/components/InventorySubcategoryForm";

export default function EditInventorySubcategoryPage({
  params,
}: {
  params: { id: string };
}) {
  return <InventorySubcategoryForm subcategoryId={params.id} />;
}
