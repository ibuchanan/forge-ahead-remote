import { describe, expect, it } from "vitest";
import {
  getAllowedTransitions,
  isActiveState,
  isTerminalState,
  isValidTransition,
} from "../../src/a2a";

describe("isActiveState", () => {
  it("returns true for submitted, working, auth-required, and unknown", () => {
    expect(isActiveState("submitted")).toBe(true);
    expect(isActiveState("working")).toBe(true);
    expect(isActiveState("auth-required")).toBe(true);
    expect(isActiveState("unknown")).toBe(true);
  });

  it("returns false for input-required and every terminal state", () => {
    expect(isActiveState("input-required")).toBe(false);
    expect(isActiveState("completed")).toBe(false);
    expect(isActiveState("rejected")).toBe(false);
    expect(isActiveState("canceled")).toBe(false);
    expect(isActiveState("failed")).toBe(false);
  });
});

describe("isTerminalState", () => {
  it("returns true for completed, rejected, canceled, and failed", () => {
    expect(isTerminalState("completed")).toBe(true);
    expect(isTerminalState("rejected")).toBe(true);
    expect(isTerminalState("canceled")).toBe(true);
    expect(isTerminalState("failed")).toBe(true);
  });

  it("returns false for every active state and input-required", () => {
    expect(isTerminalState("submitted")).toBe(false);
    expect(isTerminalState("working")).toBe(false);
    expect(isTerminalState("input-required")).toBe(false);
    expect(isTerminalState("auth-required")).toBe(false);
    expect(isTerminalState("unknown")).toBe(false);
  });
});

describe("isValidTransition", () => {
  it("allows submitted to transition to working", () => {
    expect(isValidTransition("submitted", "working")).toBe(true);
  });

  it("rejects submitted transitioning directly to input-required", () => {
    expect(isValidTransition("submitted", "input-required")).toBe(false);
  });

  it("rejects every transition out of a terminal state", () => {
    expect(isValidTransition("completed", "working")).toBe(false);
    expect(isValidTransition("rejected", "working")).toBe(false);
    expect(isValidTransition("canceled", "working")).toBe(false);
    expect(isValidTransition("failed", "working")).toBe(false);
  });
});

describe("getAllowedTransitions", () => {
  it("returns the allowed transitions for an active state", () => {
    expect(getAllowedTransitions("working")).toEqual([
      "input-required",
      "auth-required",
      "completed",
      "failed",
      "canceled",
    ]);
  });

  it("returns no allowed transitions for a terminal state", () => {
    expect(getAllowedTransitions("completed")).toEqual([]);
  });
});
