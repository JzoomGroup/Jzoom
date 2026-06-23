import type { DynamicModule } from "@nestjs/common";
import { Module } from "@nestjs/common";
import type { ApiEnvironment } from "@jzoom/config";
import { AuthModule } from "./auth/auth.module.js";
import { CatalogModule } from "./catalog-admin/catalog.module.js";
import { ClientPortalModule } from "./client-portal/client-portal.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthModule } from "./health/health.module.js";
import { HoursLedgerModule } from "./hours-ledger/hours-ledger.module.js";
import { InvoicesModule } from "./invoices/invoices.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { OneTimeCatalogModule } from "./one-time-catalog/one-time-catalog.module.js";
import { PlatformConfigurationModule } from "./platform-configuration/platform-configuration.module.js";
import { PricingModule } from "./pricing/pricing.module.js";
import { QuotesModule } from "./quotes/quotes.module.js";
import { ReportsModule } from "./reports/reports.module.js";
import { RequestContextModule } from "./request-context/request-context.module.js";
import { RequestsModule } from "./requests/requests.module.js";

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
        NotificationsModule,
        ClientPortalModule,
        RequestsModule,
        ReportsModule,
        HoursLedgerModule,
        PlatformConfigurationModule,
        HealthModule,
      ],
    };
  }
}
