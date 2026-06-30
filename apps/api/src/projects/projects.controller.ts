import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiExtraModels, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ADMIN_ROLE_CODE, MANAGEMENT_ROLE_CODE } from "../auth/auth.constants.js";
import { RequireRoles } from "../auth/auth.decorators.js";
import { CLIENT_ROLE_CODE } from "../client-portal/client-portal.constants.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import type { RequestWithId } from "../request-context/request-with-id.js";
import {
  ACCOUNT_MANAGER_ROLE_CODE,
  SPECIALIST_ROLE_CODE,
  SUPERVISOR_ROLE_CODE,
} from "../requests/requests.constants.js";
import {
  ClientProjectOutputDecisionDto,
  CreateProjectOutputDto,
  ProjectOutputStatusDto,
  ProjectStatusDto,
  UpdateProjectTaskDto,
} from "./projects.dto.js";
import { PROJECT_SPECIALIST_ROLE_CODE } from "./projects.constants.js";
import { ProjectsService } from "./projects.service.js";

function metadata(request: RequestWithId): RequestMetadata {
  const userAgent = request.header("user-agent");
  return {
    ...(request.requestId ? { requestId: request.requestId } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

@ApiTags("projects")
@ApiCookieAuth()
@ApiExtraModels(
  CreateProjectOutputDto,
  ClientProjectOutputDecisionDto,
  ProjectOutputStatusDto,
  ProjectStatusDto,
  UpdateProjectTaskDto,
)
@RequireRoles(
  ADMIN_ROLE_CODE,
  MANAGEMENT_ROLE_CODE,
  ACCOUNT_MANAGER_ROLE_CODE,
  SPECIALIST_ROLE_CODE,
  PROJECT_SPECIALIST_ROLE_CODE,
  SUPERVISOR_ROLE_CODE,
)
@Controller("projects")
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projects: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: "List one-time service projects within the caller's operating scope" })
  list(@Req() request: RequestWithId) {
    return this.projects.list(request.auth!);
  }

  @Get(":id")
  @ApiOperation({ summary: "Retrieve a one-time service project detail view" })
  get(@Param("id") id: string, @Req() request: RequestWithId) {
    return this.projects.get(id, request.auth!);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Change a one-time project lifecycle status" })
  changeStatus(
    @Param("id") id: string,
    @Body() input: ProjectStatusDto,
    @Req() request: RequestWithId,
  ) {
    return this.projects.changeStatus(id, input, request.auth!, metadata(request));
  }

  @Patch(":id/tasks/:taskId")
  @ApiOperation({ summary: "Update a one-time project task status" })
  updateTask(
    @Param("id") id: string,
    @Param("taskId") taskId: string,
    @Body() input: UpdateProjectTaskDto,
    @Req() request: RequestWithId,
  ) {
    return this.projects.updateTask(id, taskId, input, request.auth!, metadata(request));
  }

  @Post(":id/outputs")
  @HttpCode(200)
  @ApiOperation({ summary: "Create a project output or deliverable record" })
  createOutput(
    @Param("id") id: string,
    @Body() input: CreateProjectOutputDto,
    @Req() request: RequestWithId,
  ) {
    return this.projects.createOutput(id, input, request.auth!, metadata(request));
  }

  @Patch(":id/outputs/:outputId/status")
  @ApiOperation({ summary: "Change a project output visibility or approval status" })
  changeOutputStatus(
    @Param("id") id: string,
    @Param("outputId") outputId: string,
    @Body() input: ProjectOutputStatusDto,
    @Req() request: RequestWithId,
  ) {
    return this.projects.changeOutputStatus(id, outputId, input, request.auth!, metadata(request));
  }
}

@ApiTags("client-portal")
@ApiCookieAuth()
@RequireRoles(CLIENT_ROLE_CODE)
@Controller("client-portal/projects")
export class ClientProjectsController {
  constructor(@Inject(ProjectsService) private readonly projects: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: "List client-safe one-time projects for the current portal account" })
  list(@Req() request: RequestWithId) {
    return this.projects.listClientProjects(request.auth!);
  }

  @Get(":id")
  @ApiOperation({ summary: "Retrieve a client-safe one-time project view" })
  get(@Param("id") id: string, @Req() request: RequestWithId) {
    return this.projects.getClientProject(id, request.auth!, metadata(request));
  }

  @Patch(":id/outputs/:outputId/status")
  @ApiOperation({ summary: "Accept or return a project output from the client portal" })
  changeOutputStatus(
    @Param("id") id: string,
    @Param("outputId") outputId: string,
    @Body() input: ClientProjectOutputDecisionDto,
    @Req() request: RequestWithId,
  ) {
    return this.projects.changeClientOutputStatus(
      id,
      outputId,
      input,
      request.auth!,
      metadata(request),
    );
  }
}
