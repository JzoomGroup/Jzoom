import { Module } from "@nestjs/common";
import {
  AdminOneTimeCatalogController,
  OneTimeServicesController,
} from "./one-time-catalog.controller.js";
import { OneTimeCatalogService } from "./one-time-catalog.service.js";

@Module({
  controllers: [AdminOneTimeCatalogController, OneTimeServicesController],
  providers: [OneTimeCatalogService],
})
export class OneTimeCatalogModule {}
