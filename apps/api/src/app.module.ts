import type { DynamicModule } from "@nestjs/common";
import { Module } from "@nestjs/common";
import type { ApiEnvironment } from "@jzoom/config";
import { AuthModule } from "./auth/auth.module.js";
import { CatalogModule } from "./catalog-admin/catalog.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthModule } from "./health/health.module.js";
import { InvoicesModule } from "./invoices/invoices.module.js";
import { OneTimeCatalogModule } from "./one-time-catalog/one-time-catalog.module.js";
import { PricingModule } from "./pricing/pricing.module.js";
import { QuotesModule } from "./quotes/quotes.module.js";
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
        OneTimeCatalogModule,
        PricingModule,
        QuotesModule,
        InvoicesModule,
        HealthModule,
      ],
    };
  }
}
