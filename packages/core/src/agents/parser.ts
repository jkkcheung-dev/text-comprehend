import type { ZodSchema } from "zod";

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function extractJson(raw: string): string {
  // Find all code fence blocks
  const fenceRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/g;
  const matches: string[] = [];
  let match;
  while ((match = fenceRegex.exec(raw)) !== null) {
    matches.push(match[1].trim());
  }

  if (matches.length > 0) {
    // Try the last fence first (most likely to be the final answer),
    // then fall back through earlier fences
    for (let i = matches.length - 1; i >= 0; i--) {
      try {
        JSON.parse(matches[i]);
        return matches[i];
      } catch {
        // Not valid JSON, try the next fence
      }
    }
    // None parsed as JSON -- return the last one so the caller gets
    // a meaningful parse error
    return matches[matches.length - 1];
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
