// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TransactionForm } from "./transaction-form";

const createTransaction = vi.fn();
vi.mock("./actions", () => ({
  createTransaction: (...args: unknown[]) => createTransaction(...args),
}));

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TransactionForm />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  createTransaction.mockResolvedValue({ id: "txn-1" });
});

describe("TransactionForm", () => {
  it("shows validation errors and does not submit when required fields are empty", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: /add transaction/i }));

    expect(await screen.findByText(/category is required/i)).toBeInTheDocument();
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it("submits parsed values when the form is valid", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/amount/i), "25.50");
    await user.type(screen.getByLabelText(/category/i), "Coffee");

    await user.click(screen.getByRole("button", { name: /add transaction/i }));

    await vi.waitFor(() => expect(createTransaction).toHaveBeenCalledOnce());
    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "EXPENSE",
        amount: 25.5,
        category: "Coffee",
        currency: "AUD",
      }),
    );
  });
});
