import { HttpException } from "@nestjs/common";
import { type ErrorCode } from "@vibeahack/shared";

/**
 * Throw from controllers / services. The global filter shapes every response
 * into the §6b error envelope.
 */
export class ApiException extends HttpException {
  constructor(
    status: number,
    public readonly code: ErrorCode | string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }
}
