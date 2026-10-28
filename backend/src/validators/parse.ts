import { z } from 'zod';
import { ApiError } from '../utils/api-error';

/** Validate untrusted input. Throws 422 with field-level messages on failure. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!fieldErrors[key]) {
        fieldErrors[key] = issue.code === 'unrecognized_keys' ? 'Unexpected field(s) in request' : issue.message;
      }
    }
    throw new ApiError(422, 'Please correct the highlighted fields', 'VALIDATION_ERROR', fieldErrors);
  }
  return result.data;
}
