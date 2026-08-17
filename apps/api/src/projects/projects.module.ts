import { Module } from "@nestjs/common";
import { FileStorageService } from "../requests/file-storage.service.js";
import { ClientProjectsController, ProjectsController } from "./projects.controller.js";
import { ProjectsService } from "./projects.service.js";

@Module({
  controllers: [ProjectsController, ClientProjectsController],
  providers: [FileStorageService, ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
