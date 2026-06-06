// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FoodSearch } from "./food-search";
import type { FoodHit } from "./openfoodfacts";

const searchFoods = vi.fn();
vi.mock("./actions", () => ({
  searchFoods: (...a: unknown[]) => searchFoods(...a),
}));

const hit: FoodHit = {
  name: "Greek yoghurt",
  barcode: "123",
  per100g: { calories: 100, protein: 10, carbs: 5, fat: 2 },
};

beforeEach(() => {
  vi.clearAllMocks();
  searchFoods.mockResolvedValue([hit]);
});

describe("FoodSearch", () => {
  it("searches, then emits a gram-scaled pick", async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<FoodSearch onPick={onPick} />);

    await user.type(
      screen.getByRole("searchbox", { name: /open food facts/i }),
      "yog",
    );

    // Debounced result appears.
    await user.click(await screen.findByRole("button", { name: /greek yoghurt/i }));

    const grams = screen.getByLabelText(/grams/i);
    await user.clear(grams);
    await user.type(grams, "200");
    await user.click(screen.getByRole("button", { name: /use this/i }));

    expect(onPick).toHaveBeenCalledWith({
      name: "Greek yoghurt",
      barcode: "123",
      grams: 200,
      calories: 200,
      protein: 20,
      carbs: 10,
      fat: 4,
    });
  });

  it("does not query for very short input", async () => {
    const user = userEvent.setup();
    render(<FoodSearch onPick={vi.fn()} />);

    await user.type(screen.getByRole("searchbox", { name: /open food facts/i }), "y");
    // Give any debounce a chance to (not) fire.
    await new Promise((r) => setTimeout(r, 400));

    expect(searchFoods).not.toHaveBeenCalled();
  });
});
