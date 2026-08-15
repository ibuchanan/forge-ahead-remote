import { describe, expect, it } from "vitest";

describe("extractCloudId", () => {
  it("is exported from the root package", async () => {
    const { extractCloudId } = await import("../src/index");
    expect(typeof extractCloudId).toBe("function");
  });

  it("extracts the cloudId from a Jira site ARI", async () => {
    const { extractCloudId } = await import("../src/index");
    expect(extractCloudId("ari:cloud:jira::site/abc-123")).toBe("abc-123");
  });

  it("returns undefined for an ARI that is not a Jira site ARI", async () => {
    const { extractCloudId } = await import("../src/index");
    expect(
      extractCloudId("ari:cloud:confluence::site/abc-123"),
    ).toBeUndefined();
  });

  it("returns undefined for a malformed ARI", async () => {
    const { extractCloudId } = await import("../src/index");
    expect(extractCloudId("not-an-ari")).toBeUndefined();
  });

  it("returns undefined for undefined input", async () => {
    const { extractCloudId } = await import("../src/index");
    expect(extractCloudId(undefined)).toBeUndefined();
  });
});
