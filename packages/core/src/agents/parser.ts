import type { ZodSchema } from "zod";

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function extractJson(raw: string): string {
  // Try to extract JSON from markdown code fences
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return raw.trim();
}

export function parseAgentResponse<T>(
  raw: string,
  schema: ZodSchema<T>,
): ParseResult<T> {
  const jsonString = extractJson(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    return {
      success: false,
      error: `Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      success: false,
      error: `Schema validation failed: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    };
  }

  return { success: true, data: result.data };
}
