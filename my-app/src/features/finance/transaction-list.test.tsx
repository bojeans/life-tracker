// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TransactionList } from "./transaction-list";
import type { TransactionDTO } from "./types";

const getTransactions = vi.fn();
const deleteTransaction = vi.fn();
vi.mock("./actions", () => ({
  getTransactions: (...a: unknown[]) => getTransactions(...a),
  deleteTransaction: (...a: unknown[]) => deleteTransaction(...a),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
}));

const txn: TransactionDTO = {
  id: "txn-1",
  type: "EXPENSE",
  amount: 42.5,
  currency: "AUD",
  category: "Groceries",
  description: "Woolworths",
  date: "2026-06-01T00:00:00.000Z",
  source: "MANUAL",
};

function renderList() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TransactionList initialData={[txn]} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getTransactions.mockResolvedValue([txn]);
  deleteTransaction.mockResolvedValue(undefined);
});

describe("TransactionList delete", () => {
  it("asks for confirmation and does not delete on the first click", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(deleteTransaction).not.toHaveBeenCalled();
    expect(screen.getByText(/delete transaction\?/i)).toBeInTheDocument();
  });

  it("cancelling closes the dialog without deleting", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(deleteTransaction).not.toHaveBeenCalled();
  });

  it("deletes the transaction after confirming", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    // Two "Delete" buttons now exist (row + dialog); the dialog's is last.
    const deletes = screen.getAllByRole("button", { name: "Delete" });
    await user.click(deletes[deletes.length - 1]);

    expect(deleteTransaction).toHaveBeenCalledWith("txn-1");
  });

  it("removes the row from the list after a successful delete", async () => {
    const user = userEvent.setup();
    // Refetches reflect server state: the row is present until it's deleted.
    let deleted = false;
    deleteTransaction.mockImplementation(async () => {
      deleted = true;
    });
    getTransactions.mockImplementation(async () => (deleted ? [] : [txn]));
    renderList();

    expect(screen.getByRole("listitem")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const deletes = screen.getAllByRole("button", { name: "Delete" });
    await user.click(deletes[deletes.length - 1]);

    expect(await screen.findByText(/no transactions yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});
