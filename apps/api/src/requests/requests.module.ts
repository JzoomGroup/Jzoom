import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { ClientRequestsController, RequestsController } from "./requests.controller.js";
import { RequestsService } from "./requests.service.js";

@Module({
  imports: [NotificationsModule],
  controllers: [RequestsController, ClientRequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
