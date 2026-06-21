import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { DatabaseService } from "../database/database.service.js";
import type { RequestMetadata } from "./auth.types.js";

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
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  anonymizeEmail(email: string): string {
    return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  }

  async record(event: AuditEvent, metadata: RequestMetadata = {}): Promise<void> {
    await this.database.prisma.auditLog.create({
      data: {
        eventCode: event.eventCode,
        entityType: event.entityType,
        severity: event.severity ?? "MEDIUM",
        ...(event.actorId ? { actorId: event.actorId } : {}),
        ...(event.entityId ? { entityId: event.entityId } : {}),
        ...(event.before ? { before: event.before } : {}),
        ...(event.after ? { after: event.after } : {}),
        ...(event.reason ? { reason: event.reason } : {}),
        ...(metadata.requestId ? { requestId: metadata.requestId } : {}),
        ...(metadata.ipAddress ? { ipAddress: metadata.ipAddress } : {}),
        ...(metadata.userAgent ? { userAgent: metadata.userAgent } : {}),
      },
    });
  }
}
