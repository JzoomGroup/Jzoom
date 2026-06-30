import { Module } from "@nestjs/common";
import { ClientProjectsController, ProjectsController } from "./projects.controller.js";
import { ProjectsService } from "./projects.service.js";

@Module({
  controllers: [ProjectsController, ClientProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
