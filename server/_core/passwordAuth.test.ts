import { describe, expect, it } from "vitest";
import {
  createOneTimeToken,
  hashOneTimeToken,
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from "./passwordAuth";

describe("password authentication helpers", () => {
  it("verifies a password without storing the raw password", async () => {
    const encoded = await hashPassword("correct horse battery staple");
    expect(encoded).toMatch(/^scrypt\$/);
    await expect(
      verifyPassword("correct horse battery staple", encoded)
    ).resolves.toBe(true);
    await expect(verifyPassword("incorrect password", encoded)).resolves.toBe(
      false
    );
  }, 15_000);

  it("rejects malformed password hashes", async () => {
    await expect(verifyPassword("password", "not-a-valid-hash")).resolves.toBe(
      false
    );
  });

  it("creates random one-time tokens and stores only their digest", () => {
    const first = createOneTimeToken();
    const second = createOneTimeToken();
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashOneTimeToken(first.token));
    expect(first.tokenHash).not.toBe(first.token);
  });

  it("normalizes email addresses consistently", () => {
    expect(normalizeEmail("  Owner@Example.COM ")).toBe("owner@example.com");
  });
});
