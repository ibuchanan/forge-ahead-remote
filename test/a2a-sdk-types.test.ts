import { describe, expect, it } from "vitest";

describe("@forge-ahead/remote/a2a exports @a2a-js/sdk types", () => {
  it("exports TaskState enum from @a2a-js/sdk", async () => {
    const a2a = await import("../src/a2a");
    const sdk = await import("@a2a-js/sdk");
    expect(a2a.TaskState).toBe(sdk.TaskState);
    expect(a2a.TaskState.TASK_STATE_WORKING).toBe(
      sdk.TaskState.TASK_STATE_WORKING,
    );
  });

  it("exports Task, Message, Part, Artifact, Role, and StreamResponse types", async () => {
    const a2a = await import("../src/a2a");
    expect(a2a.Task).toBeDefined();
    expect(a2a.Message).toBeDefined();
    expect(a2a.Part).toBeDefined();
    expect(a2a.Artifact).toBeDefined();
    expect(a2a.Role).toBeDefined();
    expect(a2a.StreamResponse).toBeDefined();
  });
});
