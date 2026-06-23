import { Module } from "@nestjs/common";
import { PlatformConfigurationController } from "./platform-configuration.controller.js";
import { PlatformConfigurationService } from "./platform-configuration.service.js";

@Module({
  controllers: [PlatformConfigurationController],
  providers: [PlatformConfigurationService],
})
export class PlatformConfigurationModule {}
