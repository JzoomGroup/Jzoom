import { Module } from "@nestjs/common";
import {
  RequestTemplatesController,
  AdminRequestTemplatesController,
} from "./request-templates.controller.js";
import { RequestTemplatesService } from "./request-templates.service.js";

@Module({
  controllers: [AdminRequestTemplatesController, RequestTemplatesController],
  providers: [RequestTemplatesService],
  exports: [RequestTemplatesService],
})
export class RequestTemplatesModule {}
