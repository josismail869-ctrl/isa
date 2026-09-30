import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  createDailyUpdate: vi.fn(async () => ({ success: true })),
  createMembershipRequest: vi.fn(),
  deleteDailyUpdate: vi.fn(async () => ({ success: true })),
  getLatestDailyUpdate: vi.fn(async () => null),
  listAdminDailyUpdates: vi.fn(async () => []),
  listAdminMembershipRequests: vi.fn(async () => []),
  updateDailyUpdate: vi.fn(async () => ({ success: true })),
  updateMembershipRequestStatus: vi.fn(async () => ({ success: true })),
}));

function createContext(role: "admin" | "user" | null): TrpcContext {
  return {
    user: role
      ? {
          id: 7,
          openId: "test",
          name: "Test",
          email: "test@example.com",
          role,
          loginMethod: "oauth",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req: {
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

describe("admin procedures", () => {
  it("rejects anonymous callers", async () => {
    await expect(
      appRouter.createCaller(createContext(null)).admin.membershipRequests()
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  describe("password account setup", () => {
    it("does not issue account flows when email delivery is unconfigured", async () => {
      await expect(
        appRouter.createCaller(createContext(null)).auth.signUp({
          name: "New Member",
          email: "new@example.com",
          password: "a-long-test-password",
        })
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    });
  });

  it("rejects regular users", async () => {
    await expect(
      appRouter.createCaller(createContext("user")).admin.dailyUpdates()
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows administrators to read management data", async () => {
    await expect(
      appRouter.createCaller(createContext("admin")).admin.membershipRequests()
    ).resolves.toEqual([]);
    await expect(
      appRouter.createCaller(createContext("admin")).admin.dailyUpdates()
    ).resolves.toEqual([]);
  });

  it("validates a daily update before accepting it", async () => {
    await expect(
      appRouter.createCaller(createContext("admin")).admin.createDailyUpdate({
        title: "",
        caption: null,
        imageUrl: null,
      })
    ).rejects.toThrow();
  });
});
