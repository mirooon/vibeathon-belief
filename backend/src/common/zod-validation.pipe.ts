import {
  type ArgumentMetadata,
  HttpStatus,
  type PipeTransform,
} from "@nestjs/common";
import type { ZodSchema } from "zod";
import { ApiException } from "./api-exception.js";

/**
 * Validates request payloads against a zod schema at the DTO boundary.
 * On failure, raises a §6b-shaped 400 with the stable code INVALID_REQUEST
 * and a `details` field carrying zod's field-level error breakdown.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "INVALID_REQUEST",
        "Request validation failed",
        { issues: result.error.flatten() },
      );
    }
    return result.data;
  }
}
