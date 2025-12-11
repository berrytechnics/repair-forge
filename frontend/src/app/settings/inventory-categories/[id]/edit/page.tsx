import InventoryCategoryForm from "@/components/InventoryCategoryForm";

export default function EditInventoryCategoryPage({
  params,
}: {
  params: { id: string };
}) {
  return <InventoryCategoryForm categoryId={params.id} />;
}
