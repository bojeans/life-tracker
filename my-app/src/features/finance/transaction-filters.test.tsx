// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionFilters } from "./transaction-filters";
import { EMPTY_FILTER } from "./filters";

function setup() {
  const onChange = vi.fn();
  render(
    <TransactionFilters
      value={EMPTY_FILTER}
      onChange={onChange}
      categories={["Coffee", "Groceries"]}
    />,
  );
  return { onChange };
}

describe("TransactionFilters", () => {
  it("emits a search term as the user types", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.type(screen.getByRole("searchbox", { name: /search/i }), "x");

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "x" }),
    );
  });

  it("emits the chosen type when a type chip is clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.click(screen.getByRole("button", { name: "Income" }));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "INCOME" }),
    );
  });

  it("emits a single-category filter from the category select", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.selectOptions(
      screen.getByRole("combobox", { name: /category/i }),
      "Coffee",
    );

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ categories: ["Coffee"] }),
    );
  });

  it("applies a date-preset range when a preset chip is clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.click(screen.getByRole("button", { name: "This year" }));

    const arg = onChange.mock.lastCall![0];
    expect(arg.from).toMatch(/^\d{4}-01-01$/);
    expect(arg.to).toMatch(/^\d{4}-12-31$/);
  });

  it("reveals custom date inputs when Custom is selected", async () => {
    const user = userEvent.setup();
    setup();

    expect(screen.queryByLabelText(/from date/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Custom" }));
    expect(screen.getByLabelText(/from date/i)).toBeInTheDocument();
  });
});
