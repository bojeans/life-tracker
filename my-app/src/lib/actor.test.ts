import { describe, it, expect, vi, beforeEach } from "vitest";

const auth = vi.fn();
const get = vi.fn();
const findUnique = vi.fn();

vi.mock("./auth", () => ({ auth: () => auth() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get }) }));
vi.mock("./db", () => ({
  db: { user: { findUnique: (...a: unknown[]) => findUnique(...a) } },
}));

import { resolveActorUserId, isDemoActor } from "./actor";

beforeEach(() => vi.clearAllMocks());

describe("resolveActorUserId", () => {
  it("returns the signed-in owner's id first", async () => {
    auth.mockResolvedValue({ user: { id: "owner-1" } });
    get.mockReturnValue(undefined);

    expect(await resolveActorUserId()).toBe("owner-1");
    expect(findUnique).not.toHaveBeenCalled(); // no demo lookup needed
  });

  it("honors the demo cookie only when that user is isDemo", async () => {
    auth.mockResolvedValue(null);
    get.mockReturnValue({ value: "demo-1" });
    findUnique.mockResolvedValue({ id: "demo-1", isDemo: true });

    expect(await resolveActorUserId()).toBe("demo-1");
  });

  it("rejects a forged cookie pointing at a non-demo (real) user", async () => {
    auth.mockResolvedValue(null);
    get.mockReturnValue({ value: "owner-1" });
    findUnique.mockResolvedValue({ id: "owner-1", isDemo: false });

    await expect(resolveActorUserId()).rejects.toThrow("Unauthorized");
  });

  it("throws when there is neither a session nor a demo cookie", async () => {
    auth.mockResolvedValue(null);
    get.mockReturnValue(undefined);

    await expect(resolveActorUserId()).rejects.toThrow("Unauthorized");
  });
});

describe("isDemoActor", () => {
  it("is false for the signed-in owner", async () => {
    auth.mockResolvedValue({ user: { id: "owner-1" } });
    expect(await isDemoActor()).toBe(false);
  });

  it("is true for a valid demo cookie", async () => {
    auth.mockResolvedValue(null);
    get.mockReturnValue({ value: "demo-1" });
    findUnique.mockResolvedValue({ id: "demo-1", isDemo: true });
    expect(await isDemoActor()).toBe(true);
  });
});
