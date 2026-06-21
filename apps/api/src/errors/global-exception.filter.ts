import { randomUUID } from "node:crypto";
import {
  Catch,
  ConsoleLogger,
  type ArgumentsHost,
  type ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import { REQUEST_ID_HEADER } from "@jzoom/contracts";
import type { Response } from "express";
import { createApiErrorResponse } from "./api-error.factory.js";
import type { RequestWithId } from "../request-context/request-with-id.js";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new ConsoleLogger("GlobalExceptionFilter", {
    json: true,
    timestamp: true,
  });

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const request = httpContext.getRequest<RequestWithId>();
    const response = httpContext.getResponse<Response>();
    const requestId = request.requestId ?? randomUUID();
    const errorResponse = createApiErrorResponse(exception, requestId, request.originalUrl);

    response.setHeader(REQUEST_ID_HEADER, requestId);

    if (!(exception instanceof HttpException) || errorResponse.statusCode >= 500) {
      this.logger.error({
        event: "http_request_failed",
        requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode: errorResponse.statusCode,
        error: exception instanceof Error ? exception.message : "Unknown error",
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }
}
