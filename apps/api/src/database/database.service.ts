import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseClient, type JzoomDatabaseClient } from "@jzoom/database";
import { DATABASE_URL } from "./database.constants.js";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly client: JzoomDatabaseClient;

  constructor(@Inject(DATABASE_URL) databaseUrl: string) {
    this.client = createDatabaseClient(databaseUrl);
  }

  async ping(): Promise<void> {
    await this.client.$queryRaw`SELECT 1`;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
