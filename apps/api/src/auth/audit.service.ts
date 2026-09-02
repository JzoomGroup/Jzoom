import { Inject, Injectable, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
import { DatabaseService } from "../database/database.service.js";
import type { RequestMetadata } from "./auth.types.js";
import { RequestContextService } from "../request-context/request-context.service.js";

export interface AuditEvent {
  actorId?: string;
  eventCode: string;
  entityType: string;
  entityId?: string;
  before?: object;
  after?: object;
  reason?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

@Injectable()
export class AuthAuditService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Optional()
    @Inject(RequestContextService)
    private readonly requestContext?: RequestContextService,
  ) {}

  anonymizeEmail(email: string): string {
    return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  }

  async record(event: AuditEvent, metadata: RequestMetadata = {}): Promise<void> {
    const uatImpersonation = this.requestContext?.getUatImpersonation();
    const after = uatImpersonation ? { ...(event.after ?? {}), uatImpersonation } : event.after;
    await this.database.prisma.auditLog.create({
      data: {
        eventCode: event.eventCode,
        entityType: event.entityType,
        severity: event.severity ?? "MEDIUM",
        ...(event.actorId ? { actorId: event.actorId } : {}),
        ...(event.entityId ? { entityId: event.entityId } : {}),
        ...(event.before ? { before: event.before } : {}),
        ...(after ? { after } : {}),
        ...(event.reason ? { reason: event.reason } : {}),
        ...(metadata.requestId ? { requestId: metadata.requestId } : {}),
        ...(metadata.ipAddress ? { ipAddress: metadata.ipAddress } : {}),
        ...(metadata.userAgent ? { userAgent: metadata.userAgent } : {}),
      },
    });
  }
}
