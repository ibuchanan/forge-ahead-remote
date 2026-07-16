import { z } from "zod";
import type { StreamResponse } from "./task-state";

const ArtifactUpdateEventShape = z
  .object({
    artifact: z.object({ parts: z.array(z.unknown()) }).loose(),
    append: z.boolean().optional(),
    lastChunk: z.boolean().optional(),
  })
  .loose();

const StreamResponseSchema = z.union([
  z.object({ task: z.unknown() }).strict(),
  z.object({ statusUpdate: z.unknown() }).strict(),
  z.object({ message: z.unknown() }).strict(),
  z.object({ artifactUpdate: ArtifactUpdateEventShape }).strict(),
]);

export function isValidStreamResponse(
  response: unknown,
): response is StreamResponse {
  return StreamResponseSchema.safeParse(response).success;
}
