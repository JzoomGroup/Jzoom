import { Inject, Injectable, type NestMiddleware } from "@nestjs/common";
import { REQUEST_ID_HEADER } from "@jzoom/contracts";
import type { NextFunction, Response } from "express";
import { RequestContextService } from "./request-context.service.js";
import type { RequestWithId } from "./request-with-id.js";
import { resolveRequestId } from "./request-id.js";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(
    @Inject(RequestContextService) private readonly requestContext: RequestContextService,
  ) {}

  use(request: RequestWithId, response: Response, next: NextFunction): void {
    const requestId = resolveRequestId(request.header(REQUEST_ID_HEADER));

    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);
    this.requestContext.run(requestId, next);
  }
}
