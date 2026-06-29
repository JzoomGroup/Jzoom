import { Body, Controller, Get, Inject, Param, Patch, Post, Put, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiExtraModels, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ADMIN_ROLE_CODE, MANAGEMENT_ROLE_CODE } from "../auth/auth.constants.js";
import { RequirePermissions, RequireRoles } from "../auth/auth.decorators.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import type { RequestWithId } from "../request-context/request-with-id.js";
import { MANAGE_CLIENTS_PERMISSION } from "./clients.constants.js";
import {
  ArchiveClientDto,
  ClientStatusDto,
  CreateClientDto,
  CreateClientPortalUserDto,
  UpdateClientDto,
} from "./clients.dto.js";
import { ClientsService } from "./clients.service.js";

function metadata(request: RequestWithId): RequestMetadata {
  const userAgent = request.header("user-agent");
  return {
    ...(request.requestId ? { requestId: request.requestId } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

@ApiTags("admin-clients")
@ApiCookieAuth()
@ApiExtraModels(
  CreateClientDto,
  UpdateClientDto,
  ClientStatusDto,
  ArchiveClientDto,
  CreateClientPortalUserDto,
)
@RequireRoles(ADMIN_ROLE_CODE, MANAGEMENT_ROLE_CODE)
@RequirePermissions(MANAGE_CLIENTS_PERMISSION)
@Controller("admin/clients")
export class ClientsController {
  constructor(@Inject(ClientsService) private readonly clients: ClientsService) {}

  @Get()
  @ApiOperation({ summary: "Return client master data for Admin Console" })
  list() {
    return this.clients.list();
  }

  @Post()
  create(@Body() input: CreateClientDto, @Req() request: RequestWithId) {
    return this.clients.create(input, request.auth!.userId, metadata(request));
  }

  @Post(":id/users")
  @ApiOperation({ summary: "Create an active client portal user scoped to this client" })
  createPortalUser(
    @Param("id") id: string,
    @Body() input: CreateClientPortalUserDto,
    @Req() request: RequestWithId,
  ) {
    return this.clients.createPortalUser(id, input, request.auth!.userId, metadata(request));
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() input: UpdateClientDto, @Req() request: RequestWithId) {
    return this.clients.update(id, input, request.auth!.userId, metadata(request));
  }

  @Patch(":id/status")
  changeStatus(
    @Param("id") id: string,
    @Body() input: ClientStatusDto,
    @Req() request: RequestWithId,
  ) {
    return this.clients.changeStatus(
      id,
      input.status,
      input.reason,
      request.auth!.userId,
      metadata(request),
    );
  }

  @Post(":id/archive")
  archive(@Param("id") id: string, @Body() input: ArchiveClientDto, @Req() request: RequestWithId) {
    return this.clients.changeStatus(
      id,
      "ARCHIVED",
      input.reason,
      request.auth!.userId,
      metadata(request),
    );
  }
}
