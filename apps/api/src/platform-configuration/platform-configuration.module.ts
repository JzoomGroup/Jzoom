import { Module } from "@nestjs/common";
import { PlatformConfigurationController } from "./platform-configuration.controller.js";
import { PlatformConfigurationService } from "./platform-configuration.service.js";
import { RuntimePlatformSettingsService } from "./runtime-platform-settings.service.js";

@Module({
  controllers: [PlatformConfigurationController],
  providers: [PlatformConfigurationService, RuntimePlatformSettingsService],
  exports: [RuntimePlatformSettingsService],
})
export class PlatformConfigurationModule {}
