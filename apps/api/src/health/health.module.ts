import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { OperationsHealthController } from "./operations-health.controller.js";

@Module({
  controllers: [HealthController, OperationsHealthController],
})
export class HealthModule {}
