import type { DynamicModule } from "@nestjs/common";
import { Module } from "@nestjs/common";
import type { ApiEnvironment } from "@jzoom/config";
import { AuthModule } from "./auth/auth.module.js";
import { CatalogModule } from "./catalog-admin/catalog.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthModule } from "./health/health.module.js";
import { RequestContextModule } from "./request-context/request-context.module.js";

@Module({})
export class AppModule {
  static forRoot(environment: ApiEnvironment): DynamicModule {
    return {
      module: AppModule,
      imports: [
        RequestContextModule,
        DatabaseModule.forRoot(environment.databaseUrl),
        AuthModule.forRoot(environment),
        CatalogModule,
        HealthModule,
      ],
    };
  }
}
