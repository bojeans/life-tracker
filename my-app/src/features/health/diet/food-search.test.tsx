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
  brand: "Chobani",
  barcode: "123",
  per100g: { calories: 97, protein: 9, carbs: 4, fat: 5 },
  micros: { sugar: 4 },
};

beforeEach(() => {
  vi.clearAllMocks();
  searchFoods.mockResolvedValue([hit]);
});

describe("FoodSearch", () => {
  it("searches (debounced) and emits the selected raw hit", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<FoodSearch onSelect={onSelect} />);

    await user.type(
      screen.getByRole("searchbox", { name: /open food facts/i }),
      "yog",
    );
    await user.click(await screen.findByRole("button", { name: /greek yoghurt/i }));

    expect(onSelect).toHaveBeenCalledWith(hit);
  });

  it("does not query for very short input", async () => {
    const user = userEvent.setup();
    render(<FoodSearch onSelect={vi.fn()} />);

    await user.type(screen.getByRole("searchbox", { name: /open food facts/i }), "y");
    await new Promise((r) => setTimeout(r, 400));

    expect(searchFoods).not.toHaveBeenCalled();
  });
});
