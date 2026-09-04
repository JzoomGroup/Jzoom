import { Controller, Get, Inject } from "@nestjs/common";
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ADMIN_ROLE_CODE } from "../auth/auth.constants.js";
import { RequireRoles } from "../auth/auth.decorators.js";
import { DatabaseService } from "../database/database.service.js";
import { OperationsHealthResponseDto } from "./operations-health.dto.js";

@ApiTags("health")
@ApiCookieAuth()
@RequireRoles(ADMIN_ROLE_CODE)
@Controller("admin/operations-health")
export class OperationsHealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  @Get()
  @ApiOperation({ summary: "Report protected operational queue health for administrators" })
  @ApiOkResponse({ type: OperationsHealthResponseDto })
  async getStatus(): Promise<OperationsHealthResponseDto> {
    const now = new Date();
    const [pending, ready, scheduledForRetry, inFlight, attempts, oldestPending, lastProcessed] =
      await Promise.all([
        this.database.prisma.outboxEvent.count({ where: { processedAt: null } }),
        this.database.prisma.outboxEvent.count({
          where: { processedAt: null, availableAt: { lte: now } },
        }),
        this.database.prisma.outboxEvent.count({
          where: { processedAt: null, availableAt: { gt: now }, lastError: { not: null } },
        }),
        this.database.prisma.outboxEvent.count({
          where: {
            processedAt: null,
            availableAt: { gt: now },
            lastError: null,
            attemptCount: { gt: 0 },
          },
        }),
        this.database.prisma.outboxEvent.aggregate({
          where: { processedAt: null },
          _max: { attemptCount: true },
        }),
        this.database.prisma.outboxEvent.findFirst({
          where: { processedAt: null },
          orderBy: { occurredAt: "asc" },
          select: { occurredAt: true },
        }),
        this.database.prisma.outboxEvent.findFirst({
          where: { processedAt: { not: null } },
          orderBy: { processedAt: "desc" },
          select: { processedAt: true },
        }),
      ]);

    return {
      status: ready > 0 || scheduledForRetry > 0 ? "attention" : "ok",
      timestamp: now.toISOString(),
      outbox: {
        pending,
        ready,
        scheduledForRetry,
        inFlight,
        maxAttemptCount: attempts._max.attemptCount ?? 0,
        oldestPendingAt: oldestPending?.occurredAt.toISOString() ?? null,
        lastProcessedAt: lastProcessed?.processedAt?.toISOString() ?? null,
      },
    };
  }
}
