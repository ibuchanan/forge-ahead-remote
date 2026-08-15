import { describe, expect, it } from "vitest";
import {
  getAllowedTransitions,
  isActiveState,
  isTerminalState,
  isValidTransition,
  TaskState,
} from "../../src/a2a";

describe("isActiveState", () => {
  it("returns true for submitted, working, auth-required, and unknown", () => {
    expect(isActiveState(TaskState.TASK_STATE_SUBMITTED)).toBe(true);
    expect(isActiveState(TaskState.TASK_STATE_WORKING)).toBe(true);
    expect(isActiveState(TaskState.TASK_STATE_AUTH_REQUIRED)).toBe(true);
    expect(isActiveState(TaskState.TASK_STATE_UNSPECIFIED)).toBe(true);
  });

  it("returns false for input-required and every terminal state", () => {
    expect(isActiveState(TaskState.TASK_STATE_INPUT_REQUIRED)).toBe(false);
    expect(isActiveState(TaskState.TASK_STATE_COMPLETED)).toBe(false);
    expect(isActiveState(TaskState.TASK_STATE_REJECTED)).toBe(false);
    expect(isActiveState(TaskState.TASK_STATE_CANCELED)).toBe(false);
    expect(isActiveState(TaskState.TASK_STATE_FAILED)).toBe(false);
  });
});

describe("isTerminalState", () => {
  it("returns true for completed, rejected, canceled, and failed", () => {
    expect(isTerminalState(TaskState.TASK_STATE_COMPLETED)).toBe(true);
    expect(isTerminalState(TaskState.TASK_STATE_REJECTED)).toBe(true);
    expect(isTerminalState(TaskState.TASK_STATE_CANCELED)).toBe(true);
    expect(isTerminalState(TaskState.TASK_STATE_FAILED)).toBe(true);
  });

  it("returns false for every active state and input-required", () => {
    expect(isTerminalState(TaskState.TASK_STATE_SUBMITTED)).toBe(false);
    expect(isTerminalState(TaskState.TASK_STATE_WORKING)).toBe(false);
    expect(isTerminalState(TaskState.TASK_STATE_INPUT_REQUIRED)).toBe(false);
    expect(isTerminalState(TaskState.TASK_STATE_AUTH_REQUIRED)).toBe(false);
    expect(isTerminalState(TaskState.TASK_STATE_UNSPECIFIED)).toBe(false);
  });
});

describe("isValidTransition", () => {
  it("allows submitted to transition to working", () => {
    expect(
      isValidTransition(
        TaskState.TASK_STATE_SUBMITTED,
        TaskState.TASK_STATE_WORKING,
      ),
    ).toBe(true);
  });

  it("rejects submitted transitioning directly to input-required", () => {
    expect(
      isValidTransition(
        TaskState.TASK_STATE_SUBMITTED,
        TaskState.TASK_STATE_INPUT_REQUIRED,
      ),
    ).toBe(false);
  });

  it("rejects every transition out of a terminal state", () => {
    expect(
      isValidTransition(
        TaskState.TASK_STATE_COMPLETED,
        TaskState.TASK_STATE_WORKING,
      ),
    ).toBe(false);
    expect(
      isValidTransition(
        TaskState.TASK_STATE_REJECTED,
        TaskState.TASK_STATE_WORKING,
      ),
    ).toBe(false);
    expect(
      isValidTransition(
        TaskState.TASK_STATE_CANCELED,
        TaskState.TASK_STATE_WORKING,
      ),
    ).toBe(false);
    expect(
      isValidTransition(
        TaskState.TASK_STATE_FAILED,
        TaskState.TASK_STATE_WORKING,
      ),
    ).toBe(false);
  });
});

describe("getAllowedTransitions", () => {
  it("returns the allowed transitions for an active state", () => {
    expect(getAllowedTransitions(TaskState.TASK_STATE_WORKING)).toEqual([
      TaskState.TASK_STATE_INPUT_REQUIRED,
      TaskState.TASK_STATE_AUTH_REQUIRED,
      TaskState.TASK_STATE_COMPLETED,
      TaskState.TASK_STATE_FAILED,
      TaskState.TASK_STATE_CANCELED,
    ]);
  });

  it("returns no allowed transitions for a terminal state", () => {
    expect(getAllowedTransitions(TaskState.TASK_STATE_COMPLETED)).toEqual([]);
  });
});
