import {
  ConsoleLogger,
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from "@nestjs/common";
import type { WorkerEnvironment } from "@jzoom/config";
import type { Prisma } from "@jzoom/database";
import { WorkerDatabaseService } from "./worker-database.service.js";
import { WORKER_ENVIRONMENT } from "./worker.constants.js";

type ClaimedOutboxEvent = {
  id: string;
  eventType: string;
  payload: Prisma.JsonValue;
  attemptCount: number;
};

export type OutboxBatchResult = {
  claimed: number;
  failed: number;
  processed: number;
};

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown outbox processing failure";
  return message.slice(0, 2_000);
}

function recordPayload(payload: Prisma.JsonValue): Record<string, unknown> | null {
  return payload !== null && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null;
}

@Injectable()
export class OutboxProcessorService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new ConsoleLogger("OutboxProcessor", {
    json: true,
    timestamp: true,
  });
  private timer?: NodeJS.Timeout;
  private activeRun: Promise<OutboxBatchResult> | undefined;

  constructor(
    @Inject(WORKER_ENVIRONMENT) private readonly environment: WorkerEnvironment,
    @Inject(WorkerDatabaseService) private readonly database: WorkerDatabaseService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.environment.outboxEnabled) {
      this.logger.log({ event: "outbox_processor_disabled" });
      return;
    }

    this.timer = setInterval(() => void this.processOnce(), this.environment.outboxPollIntervalMs);
    this.timer.unref();
    void this.processOnce();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.activeRun;
  }

  processOnce(): Promise<OutboxBatchResult> {
    if (this.activeRun) return this.activeRun;

    this.activeRun = this.processBatch()
      .catch((error: unknown) => {
        this.logger.error({ event: "outbox_batch_failed", error: errorMessage(error) });
        return { claimed: 0, failed: 1, processed: 0 };
      })
      .finally(() => {
        this.activeRun = undefined;
      });
    return this.activeRun;
  }

  private async processBatch(): Promise<OutboxBatchResult> {
    const startedAt = performance.now();
    const events = await this.claimBatch();
    let failed = 0;
    let processed = 0;

    for (const event of events) {
      try {
        await this.dispatch(event);
        await this.database.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { lastError: null, processedAt: new Date() },
        });
        processed += 1;
      } catch (error) {
        failed += 1;
        await this.database.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            availableAt: new Date(Date.now() + this.retryDelayMs(event.attemptCount)),
            lastError: errorMessage(error),
          },
        });
      }
    }

    if (events.length > 0 || failed > 0) {
      this.logger.log({
        event: "outbox_batch_completed",
        claimed: events.length,
        failed,
        processed,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      });
    }
    return { claimed: events.length, failed, processed };
  }

  private async claimBatch(): Promise<ClaimedOutboxEvent[]> {
    const now = new Date();
    const candidates = await this.database.prisma.outboxEvent.findMany({
      where: {
        processedAt: null,
        availableAt: { lte: now },
        attemptCount: { lt: this.environment.outboxMaxAttempts },
      },
      orderBy: [{ availableAt: "asc" }, { occurredAt: "asc" }],
      select: { id: true },
      take: this.environment.outboxBatchSize,
    });
    const claimed: ClaimedOutboxEvent[] = [];

    for (const candidate of candidates) {
      const claim = await this.database.prisma.outboxEvent.updateMany({
        where: {
          id: candidate.id,
          processedAt: null,
          availableAt: { lte: now },
          attemptCount: { lt: this.environment.outboxMaxAttempts },
        },
        data: {
          attemptCount: { increment: 1 },
          availableAt: new Date(now.getTime() + this.environment.outboxLeaseMs),
        },
      });
      if (claim.count !== 1) continue;

      const event = await this.database.prisma.outboxEvent.findUnique({
        where: { id: candidate.id },
        select: { id: true, eventType: true, payload: true, attemptCount: true },
      });
      if (event) claimed.push(event);
    }
    return claimed;
  }

  private async dispatch(event: ClaimedOutboxEvent): Promise<void> {
    const payload = recordPayload(event.payload);
    const channelReadiness = recordPayload((payload?.channelReadiness ?? null) as Prisma.JsonValue);
    if (channelReadiness?.email || channelReadiness?.sms || channelReadiness?.whatsapp) {
      throw new Error(`No external delivery adapter is configured for ${event.eventType}`);
    }
    if (channelReadiness?.inApp !== true) {
      throw new Error(`Outbox event ${event.eventType} has no supported delivery channel`);
    }
  }

  private retryDelayMs(attemptCount: number): number {
    const exponent = Math.max(0, Math.min(attemptCount - 1, 8));
    return Math.min(15 * 60_000, this.environment.outboxPollIntervalMs * 2 ** exponent);
  }
}
