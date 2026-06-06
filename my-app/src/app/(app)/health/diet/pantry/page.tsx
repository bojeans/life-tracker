import { getFoodItems } from "@/features/health/diet/food-item-actions";
import { PantryView } from "@/features/health/diet/pantry-view";

export default async function PantryPage() {
  const items = await getFoodItems();

  return <PantryView initialItems={items} />;
}
