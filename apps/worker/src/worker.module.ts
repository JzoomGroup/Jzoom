import type { DynamicModule } from "@nestjs/common";
import { Module } from "@nestjs/common";
import type { WorkerEnvironment } from "@jzoom/config";
import { OutboxProcessorService } from "./outbox-processor.service.js";
import { WorkerDatabaseService } from "./worker-database.service.js";
import { WORKER_ENVIRONMENT } from "./worker.constants.js";

@Module({})
export class WorkerModule {
  static forRoot(environment: WorkerEnvironment): DynamicModule {
    return {
      module: WorkerModule,
      providers: [
        { provide: WORKER_ENVIRONMENT, useValue: environment },
        WorkerDatabaseService,
        OutboxProcessorService,
      ],
    };
  }
}
