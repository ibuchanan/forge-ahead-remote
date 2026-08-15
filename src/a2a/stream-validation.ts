import type { StreamResponse } from "@a2a-js/sdk";

/**
 * Shallow runtime check that a value is an exclusive A2A v1.0 stream response.
 *
 * It validates the envelope shape (exactly one `payload.$case`) without
 * deeply inspecting provider-specific payload content.
 */
export function isValidStreamResponse(
  response: unknown,
): response is StreamResponse {
  if (typeof response !== "object" || response === null) {
    return false;
  }
  const stream = response as Record<string, unknown>;
  if (stream.payload === undefined || stream.payload === null) {
    return false;
  }
  const payload = stream.payload as Record<string, unknown>;
  if (typeof payload.$case !== "string") {
    return false;
  }
  const validCases = ["task", "message", "statusUpdate", "artifactUpdate"];
  if (!validCases.includes(payload.$case)) {
    return false;
  }
  // Ensure exclusivity: only one top-level payload case is present.
  const caseKeys = Object.keys(stream).filter(
    (key) => key !== "payload" && validCases.includes(key),
  );
  return caseKeys.length === 0;
}
