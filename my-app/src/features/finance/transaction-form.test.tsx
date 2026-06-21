// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TransactionForm } from "./transaction-form";
import type { TransactionDTO } from "./types";

const createTransaction = vi.fn();
const updateTransaction = vi.fn();
const getTransactions = vi.fn();
vi.mock("./actions", () => ({
  createTransaction: (...args: unknown[]) => createTransaction(...args),
  updateTransaction: (...args: unknown[]) => updateTransaction(...args),
  getTransactions: (...args: unknown[]) => getTransactions(...args),
}));

const txn: TransactionDTO = {
  id: "txn-1",
  type: "EXPENSE",
  amount: 42.5,
  currency: "NZD",
  category: "Groceries",
  description: "Woolworths",
  date: "2026-06-01T00:00:00.000Z",
  source: "MANUAL",
};

// A promise whose settlement we control, so we can observe the optimistic cache
// state while the mutation is still in flight.
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderForm(props: { transaction?: TransactionDTO } = {}) {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  const result = render(
    <QueryClientProvider client={client}>
      <TransactionForm {...props} />
    </QueryClientProvider>,
  );
  return { client, ...result };
}

beforeEach(() => {
  vi.clearAllMocks();
  createTransaction.mockResolvedValue({ ...txn });
  updateTransaction.mockResolvedValue(undefined);
  getTransactions.mockResolvedValue([]);
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
        currency: "NZD",
      }),
    );
  });
});

describe("TransactionForm optimistic cache", () => {
  it("adds the new row to the cache before the server responds", async () => {
    const user = userEvent.setup();
    const pending = deferred<TransactionDTO>();
    createTransaction.mockReturnValue(pending.promise);

    const { client } = renderForm();
    client.setQueryData<TransactionDTO[]>(["transactions"], []);

    await user.type(screen.getByLabelText(/amount/i), "25.50");
    await user.type(screen.getByLabelText(/category/i), "Coffee");
    await user.click(screen.getByRole("button", { name: /add transaction/i }));

    // The mutation is still in flight, but the row is already in the cache.
    await vi.waitFor(() => {
      const cache = client.getQueryData<TransactionDTO[]>(["transactions"]);
      expect(cache).toHaveLength(1);
      expect(cache![0]).toMatchObject({
        category: "Coffee",
        amount: 25.5,
        type: "EXPENSE",
        source: "MANUAL",
      });
    });

    pending.resolve({ ...txn });
  });

  it("patches the edited row in the cache in place", async () => {
    const user = userEvent.setup();
    const pending = deferred<void>();
    updateTransaction.mockReturnValue(pending.promise);
    // The form's own category query also reads ["transactions"]; return the
    // seed so it doesn't overwrite the row we're editing.
    getTransactions.mockResolvedValue([txn]);

    const { client } = renderForm({ transaction: txn });
    client.setQueryData<TransactionDTO[]>(["transactions"], [txn]);

    const category = screen.getByLabelText(/category/i);
    await user.clear(category);
    await user.type(category, "Cafe");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await vi.waitFor(() => {
      const cache = client.getQueryData<TransactionDTO[]>(["transactions"]);
      expect(cache![0].id).toBe("txn-1"); // same row, not a new one
      expect(cache![0].category).toBe("Cafe");
    });

    pending.resolve();
  });

  it("rolls back the optimistic add when the server errors", async () => {
    const user = userEvent.setup();
    createTransaction.mockRejectedValue(new Error("boom"));

    const { client } = renderForm();
    client.setQueryData<TransactionDTO[]>(["transactions"], []);

    await user.type(screen.getByLabelText(/amount/i), "25.50");
    await user.type(screen.getByLabelText(/category/i), "Coffee");
    await user.click(screen.getByRole("button", { name: /add transaction/i }));

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(client.getQueryData<TransactionDTO[]>(["transactions"])).toEqual([]);
    });
  });
});
