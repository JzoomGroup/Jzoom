import { HttpException, HttpStatus } from "@nestjs/common";
import type { ApiErrorResponse, ApiFieldError } from "@jzoom/contracts";

interface ErrorPayload {
  code?: unknown;
  message?: unknown;
  fieldErrors?: unknown;
}

function isErrorPayload(value: unknown): value is ErrorPayload {
  return typeof value === "object" && value !== null;
}

function normalizeFieldErrors(value: unknown): ApiFieldError[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      typeof item === "object" &&
      item !== null &&
      typeof Reflect.get(item, "field") === "string" &&
      typeof Reflect.get(item, "message") === "string"
    ) {
      return [
        {
          field: Reflect.get(item, "field") as string,
          message: Reflect.get(item, "message") as string,
        },
      ];
    }

    return [];
  });
}

function defaultCodeForStatus(statusCode: number): string {
  const codeByStatus: Partial<Record<number, string>> = {
    [HttpStatus.BAD_REQUEST]: "BAD_REQUEST",
    [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
    [HttpStatus.FORBIDDEN]: "FORBIDDEN",
    [HttpStatus.NOT_FOUND]: "NOT_FOUND",
    [HttpStatus.CONFLICT]: "CONFLICT",
    [HttpStatus.UNPROCESSABLE_ENTITY]: "VALIDATION_ERROR",
    [HttpStatus.TOO_MANY_REQUESTS]: "TOO_MANY_REQUESTS",
    [HttpStatus.SERVICE_UNAVAILABLE]: "SERVICE_UNAVAILABLE",
  };

  return codeByStatus[statusCode] ?? "HTTP_ERROR";
}

function normalizeMessage(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value.join("; ");
  }

  return fallback;
}

export function createApiErrorResponse(
  exception: unknown,
  requestId: string,
  path: string,
): ApiErrorResponse {
  if (!(exception instanceof HttpException)) {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong",
      fieldErrors: [],
      requestId,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  const statusCode = exception.getStatus();
  const response = exception.getResponse();
  const payload = isErrorPayload(response) ? response : undefined;
  const fallbackMessage =
    statusCode >= 500 ? "The service could not complete the request" : exception.message;

  return {
    statusCode,
    code: typeof payload?.code === "string" ? payload.code : defaultCodeForStatus(statusCode),
    message: normalizeMessage(payload?.message ?? response, fallbackMessage),
    fieldErrors: normalizeFieldErrors(payload?.fieldErrors),
    requestId,
    timestamp: new Date().toISOString(),
    path,
  };
}
