import { z } from "zod";

/**
 * Single error envelope for every 4xx/5xx response (§6b).
 *   code:    SCREAMING_SNAKE_CASE, stable across API versions.
 *   message: human-readable, may change freely.
 *   details: optional structured context for programmatic handling.
 */
export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().regex(/^[A-Z][A-Z0-9_]*$/, "code must be SCREAMING_SNAKE_CASE"),
    message: z.string().min(1),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

/** Stable error codes. Add new values only; never rename. */
export const ErrorCode = {
  MARKET_NOT_FOUND: "MARKET_NOT_FOUND",
  OUTCOME_NOT_FOUND: "OUTCOME_NOT_FOUND",
  INVALID_REQUEST: "INVALID_REQUEST",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];
