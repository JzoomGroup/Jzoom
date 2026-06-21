import type { DynamicModule } from "@nestjs/common";
import { Global, Module } from "@nestjs/common";
import { DATABASE_URL } from "./database.constants.js";
import { DatabaseService } from "./database.service.js";

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(databaseUrl: string): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: DATABASE_URL,
          useValue: databaseUrl,
        },
        DatabaseService,
      ],
      exports: [DatabaseService],
    };
  }
}
