import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { RequestTemplatesModule } from "../request-templates/request-templates.module.js";
import { ClientRequestsController, RequestsController } from "./requests.controller.js";
import { RequestsService } from "./requests.service.js";

@Module({
  imports: [NotificationsModule, RequestTemplatesModule],
  controllers: [RequestsController, ClientRequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
