import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { PlatformConfigurationModule } from "../platform-configuration/platform-configuration.module.js";
import {
  AccountManagerController,
  ClientReportsController,
  ReportsController,
} from "./reports.controller.js";
import { ReportsService } from "./reports.service.js";

@Module({
  imports: [NotificationsModule, PlatformConfigurationModule],
  controllers: [ReportsController, ClientReportsController, AccountManagerController],
  providers: [ReportsService],
})
export class ReportsModule {}
