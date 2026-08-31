import { Module } from "@nestjs/common";
import { PlatformConfigurationModule } from "../platform-configuration/platform-configuration.module.js";
import { AdminPricingRulesController, PricingStudioController } from "./pricing.controller.js";
import { PricingService } from "./pricing.service.js";

@Module({
  imports: [PlatformConfigurationModule],
  controllers: [AdminPricingRulesController, PricingStudioController],
  providers: [PricingService],
})
export class PricingModule {}
