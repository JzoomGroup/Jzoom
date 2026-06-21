import {
  ConsoleLogger,
  HttpException,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { tap } from "rxjs";
import type { Response } from "express";
import type { RequestWithId } from "./request-with-id.js";

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new ConsoleLogger("HttpRequest", {
    json: true,
    timestamp: true,
  });

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = performance.now();
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestWithId>();
    const response = httpContext.getResponse<Response>();

    const logRequest = (statusCode: number): void => {
      this.logger.log({
        event: "http_request_completed",
        requestId: request.requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      });
    };

    return next.handle().pipe(
      tap({
        complete: () => logRequest(response.statusCode),
        error: (error: unknown) =>
          logRequest(error instanceof HttpException ? error.getStatus() : 500),
      }),
    );
  }
}
