import { describe, expect, it } from "vitest";
import { isConfiguredOwner } from "./owner";

describe("isConfiguredOwner", () => {
  it("matches the configured OAuth identity", () => {
    expect(isConfiguredOwner("owner-id", null, "owner-id", "")).toBe(true);
  });

  it("matches the configured owner email without case or surrounding-space differences", () => {
    expect(
      isConfiguredOwner(
        "provider-id",
        "  OWNER@example.com ",
        "",
        "owner@example.com"
      )
    ).toBe(true);
  });

  it("does not promote an unrelated identity when no owner is configured", () => {
    expect(isConfiguredOwner("user-id", "owner@example.com", "", "")).toBe(
      false
    );
  });
});
