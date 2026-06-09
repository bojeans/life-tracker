import type {
  BloodPressureCategory,
  BloodPressureCategoryKey,
} from "./analytics";
import { cn } from "@/lib/utils";

// Tailwind classes per AHA band. Kept as a static map (not interpolated) so the
// JIT compiler sees every class literally and doesn't purge them.
const STYLES: Record<BloodPressureCategoryKey, string> = {
  low: "bg-sky-100 text-sky-700",
  normal: "bg-green-100 text-green-700",
  elevated: "bg-yellow-100 text-yellow-800",
  stage1: "bg-orange-100 text-orange-800",
  stage2: "bg-red-100 text-red-700",
  crisis: "bg-red-600 text-white",
};

export function CategoryBadge({
  category,
  className,
}: {
  category: BloodPressureCategory;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
        STYLES[category.key],
        className,
      )}
    >
      {category.label}
    </span>
  );
}
