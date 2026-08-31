import { Module } from "@nestjs/common";
import { PlatformConfigurationModule } from "../platform-configuration/platform-configuration.module.js";
import { FileStorageService } from "../requests/file-storage.service.js";
import { ClientProjectsController, ProjectsController } from "./projects.controller.js";
import { ProjectsService } from "./projects.service.js";

@Module({
  imports: [PlatformConfigurationModule],
  controllers: [ProjectsController, ClientProjectsController],
  providers: [FileStorageService, ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
