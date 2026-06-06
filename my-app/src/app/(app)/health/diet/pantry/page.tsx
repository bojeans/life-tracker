import { getFoodItems } from "@/features/health/diet/food-item-actions";
import { PantryAdd } from "@/features/health/diet/pantry-add";
import { FoodItemForm } from "@/features/health/diet/food-item-form";
import { FoodItemList } from "@/features/health/diet/food-item-list";

export default async function PantryPage() {
  const items = await getFoodItems();

  return (
    <div className="space-y-6">
      <PantryAdd />
      <FoodItemForm />
      <FoodItemList initialData={items} />
    </div>
  );
}
