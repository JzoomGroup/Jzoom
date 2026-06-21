import { AsyncLocalStorage } from "node:async_hooks";
import { Injectable } from "@nestjs/common";
import type { RequestContext } from "@jzoom/contracts";

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  run<T>(requestId: string, callback: () => T): T {
    return this.storage.run({ requestId }, callback);
  }

  getRequestId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }
}
