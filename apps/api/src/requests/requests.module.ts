import { Module } from "@nestjs/common";
import { ClientRequestsController, RequestsController } from "./requests.controller.js";
import { RequestsService } from "./requests.service.js";

@Module({
  controllers: [RequestsController, ClientRequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
