import { AsyncLocalStorage } from "node:async_hooks";
import { Injectable } from "@nestjs/common";

interface UatImpersonationAuditContext {
  impersonatorUserId: string;
  effectiveUserId: string;
  effectiveSessionId: string;
}

interface InternalRequestContext {
  requestId: string;
  uatImpersonation?: UatImpersonationAuditContext;
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<InternalRequestContext>();

  run<T>(requestId: string, callback: () => T): T {
    return this.storage.run({ requestId }, callback);
  }

  getRequestId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }

  setUatImpersonation(context: UatImpersonationAuditContext): void {
    const store = this.storage.getStore();
    if (store) store.uatImpersonation = context;
  }

  getUatImpersonation(): UatImpersonationAuditContext | undefined {
    return this.storage.getStore()?.uatImpersonation;
  }
}
