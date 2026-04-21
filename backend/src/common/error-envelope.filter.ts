import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import type { ErrorEnvelope } from "@vibeahack/shared";

/**
 * Global exception filter — shapes every error response as §6b's envelope:
 *   { error: { code, message, details? } }
 *
 * ApiException instances pass through their code/details verbatim.
 * HttpException (e.g. Nest's BadRequestException from pipes) is mapped to a
 * best-effort code based on status. Everything else → 500 INTERNAL_ERROR.
 */
@Catch()
export class ErrorEnvelopeFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorEnvelopeFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = "INTERNAL_ERROR";
    let message = "Internal server error";
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") {
        message = body;
        code = codeForStatus(status);
      } else if (typeof body === "object" && body !== null) {
        const b = body as Record<string, unknown>;
        code = typeof b.code === "string" ? b.code : codeForStatus(status);
        message = typeof b.message === "string" ? b.message : codeForStatus(status);
        if (typeof b.details === "object" && b.details !== null) {
          details = b.details as Record<string, unknown>;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      message = "Internal server error";
    } else {
      this.logger.error(`Non-Error exception: ${String(exception)}`);
    }

    const envelope: ErrorEnvelope = {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    };

    response.status(status).json(envelope);
  }
}

function codeForStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return "INVALID_REQUEST";
    case HttpStatus.UNAUTHORIZED:
      return "UNAUTHORIZED";
    case HttpStatus.FORBIDDEN:
      return "FORBIDDEN";
    case HttpStatus.NOT_FOUND:
      return "NOT_FOUND";
    case HttpStatus.CONFLICT:
      return "CONFLICT";
    default:
      return "INTERNAL_ERROR";
  }
}
