import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiExtraModels, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ADMIN_ROLE_CODE, MANAGEMENT_ROLE_CODE } from "../auth/auth.constants.js";
import { RequireRoles } from "../auth/auth.decorators.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { CLIENT_ROLE_CODE } from "../client-portal/client-portal.constants.js";
import type { RequestWithId } from "../request-context/request-with-id.js";
import {
  AddAttachmentMetadataDto,
  AddInternalNoteDto,
  AddRequestCommentDto,
  AssignRequestDto,
  CreateRequestDto,
  RequestStatusDto,
} from "./requests.dto.js";
import {
  ACCOUNT_MANAGER_ROLE_CODE,
  SPECIALIST_ROLE_CODE,
  SUPERVISOR_ROLE_CODE,
} from "./requests.constants.js";
import { RequestsService } from "./requests.service.js";

function metadata(request: RequestWithId): RequestMetadata {
  const userAgent = request.header("user-agent");
  return {
    ...(request.requestId ? { requestId: request.requestId } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

@ApiTags("requests")
@ApiCookieAuth()
@ApiExtraModels(
  AddAttachmentMetadataDto,
  AddInternalNoteDto,
  AddRequestCommentDto,
  AssignRequestDto,
  CreateRequestDto,
  RequestStatusDto,
)
@RequireRoles(
  ADMIN_ROLE_CODE,
  MANAGEMENT_ROLE_CODE,
  ACCOUNT_MANAGER_ROLE_CODE,
  SPECIALIST_ROLE_CODE,
  SUPERVISOR_ROLE_CODE,
)
@Controller("requests")
export class RequestsController {
  constructor(@Inject(RequestsService) private readonly requests: RequestsService) {}

  @Get()
  @ApiOperation({ summary: "List service requests within the caller's internal scope" })
  list(@Req() request: RequestWithId) {
    return this.requests.list(request.auth!);
  }

  @Get(":id")
  @ApiOperation({ summary: "Retrieve an internal service request detail view" })
  get(@Param("id") id: string, @Req() request: RequestWithId) {
    return this.requests.get(id, request.auth!);
  }

  @Post()
  @ApiOperation({ summary: "Create a service request for an active client subscription service" })
  create(@Body() input: CreateRequestDto, @Req() request: RequestWithId) {
    return this.requests.create(input, request.auth!, metadata(request));
  }

  @Patch(":id/assignment")
  @ApiOperation({ summary: "Update request specialist, supervisor, or account manager assignment" })
  assign(@Param("id") id: string, @Body() input: AssignRequestDto, @Req() request: RequestWithId) {
    return this.requests.assign(id, input, request.auth!, metadata(request));
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Advance a request lifecycle state" })
  changeStatus(
    @Param("id") id: string,
    @Body() input: RequestStatusDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.changeStatus(
      id,
      input.status,
      input.reason,
      request.auth!,
      metadata(request),
    );
  }

  @Post(":id/comments")
  @HttpCode(200)
  @ApiOperation({ summary: "Add a request comment with explicit client visibility" })
  addComment(
    @Param("id") id: string,
    @Body() input: AddRequestCommentDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.addComment(id, input, request.auth!, metadata(request));
  }

  @Post(":id/internal-notes")
  @HttpCode(200)
  @ApiOperation({ summary: "Add an internal-only note to a request" })
  addInternalNote(
    @Param("id") id: string,
    @Body() input: AddInternalNoteDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.addInternalNote(id, input, request.auth!, metadata(request));
  }

  @Post(":id/attachments")
  @HttpCode(200)
  @ApiOperation({ summary: "Attach file metadata to a request without uploading file content" })
  addAttachmentMetadata(
    @Param("id") id: string,
    @Body() input: AddAttachmentMetadataDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.addAttachmentMetadata(id, input, request.auth!, metadata(request));
  }
}

@ApiTags("client-portal")
@ApiCookieAuth()
@RequireRoles(CLIENT_ROLE_CODE)
@Controller("client-portal/requests")
export class ClientRequestsController {
  constructor(@Inject(RequestsService) private readonly requests: RequestsService) {}

  @Get()
  @ApiOperation({ summary: "List client-safe requests for the current client account" })
  list(@Req() request: RequestWithId) {
    return this.requests.listClientRequests(request.auth!);
  }

  @Get(":id")
  @ApiOperation({ summary: "Retrieve a client-safe request view without internal notes" })
  get(@Param("id") id: string, @Req() request: RequestWithId) {
    return this.requests.getClientRequest(id, request.auth!, metadata(request));
  }

  @Post(":id/comments")
  @HttpCode(200)
  @ApiOperation({ summary: "Add a client-visible comment to a request" })
  addComment(
    @Param("id") id: string,
    @Body() input: AddRequestCommentDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.addClientComment(id, input, request.auth!, metadata(request));
  }
}
