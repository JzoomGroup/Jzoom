import { Module } from "@nestjs/common";
import { AdminPricingRulesController, PricingStudioController } from "./pricing.controller.js";
import { PricingService } from "./pricing.service.js";

@Module({
  controllers: [AdminPricingRulesController, PricingStudioController],
  providers: [PricingService],
})
export class PricingModule {}
