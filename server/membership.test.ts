import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  createMembershipRequest: vi.fn(async (userId: number, plan: string) => ({
    id: 1,
    userId,
    plan,
    status: "pending",
  })),
  createDailyUpdate: vi.fn(),
  deleteDailyUpdate: vi.fn(),
  getLatestDailyUpdate: vi.fn(async () => null),
  listAdminDailyUpdates: vi.fn(async () => []),
  listAdminMembershipRequests: vi.fn(async () => []),
  updateDailyUpdate: vi.fn(),
  updateMembershipRequestStatus: vi.fn(),
}));

describe("content.latestDailyUpdate", () => {
  it("returns null when no daily update has been published", async () => {
    const ctx = {
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    } as TrpcContext;
    await expect(
      appRouter.createCaller(ctx).content.latestDailyUpdate()
    ).resolves.toBeNull();
  });
});

describe("membership.requestAccess", () => {
  it("accepts a valid plan for an authenticated user", async () => {
    const ctx = {
      user: {
        id: 7,
        openId: "test",
        name: "Test",
        email: "test@example.com",
        role: "user",
        loginMethod: "manus",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    } as TrpcContext;
    const result = await appRouter
      .createCaller(ctx)
      .membership.requestAccess({ plan: "vip" });
    expect(result).toMatchObject({ userId: 7, plan: "vip", status: "pending" });
  });

  it("rejects an unsupported plan", async () => {
    const ctx = {
      user: {
        id: 7,
        openId: "test",
        name: "Test",
        email: "test@example.com",
        role: "user",
        loginMethod: "manus",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    } as TrpcContext;
    await expect(
      appRouter
        .createCaller(ctx)
        .membership.requestAccess({ plan: "gold" as "vip" })
    ).rejects.toThrow();
  });
});
