import type { ZodError } from "zod";

/**
 * Extracts the first error message and the set of field names with errors
 * from a Zod validation result.
 */
export function getFormErrors(error: ZodError): {
  message: string;
  fields: Set<string>;
} {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const fields = new Set<string>();
  let message = "";

  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) {
      fields.add(key);
      if (!message) {
        message = messages[0];
      }
    }
  }

  return { message, fields };
}
