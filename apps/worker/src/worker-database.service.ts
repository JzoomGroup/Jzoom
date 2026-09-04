import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import type { WorkerEnvironment } from "@jzoom/config";
import { createDatabaseClient, type JzoomDatabaseClient } from "@jzoom/database";
import { WORKER_ENVIRONMENT } from "./worker.constants.js";

@Injectable()
export class WorkerDatabaseService implements OnModuleDestroy {
  private readonly client: JzoomDatabaseClient;

  constructor(@Inject(WORKER_ENVIRONMENT) environment: WorkerEnvironment) {
    this.client = createDatabaseClient(environment.databaseUrl);
  }

  get prisma(): JzoomDatabaseClient {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
