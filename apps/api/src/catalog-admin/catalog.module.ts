import { Module } from "@nestjs/common";
import {
  AdminCatalogController,
  MonthlyServicesController,
  ServiceItemsController,
  ServiceLevelsController,
} from "./catalog.controller.js";
import { CatalogService } from "./catalog.service.js";

@Module({
  controllers: [
    AdminCatalogController,
    MonthlyServicesController,
    ServiceItemsController,
    ServiceLevelsController,
  ],
  providers: [CatalogService],
})
export class CatalogModule {}
