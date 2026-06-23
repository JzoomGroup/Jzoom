import { Body, Controller, Get, Inject, Param, Patch, Post, Put, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiExtraModels, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ADMIN_ROLE_CODE, MANAGEMENT_ROLE_CODE } from "../auth/auth.constants.js";
import { RequirePermissions, RequireRoles } from "../auth/auth.decorators.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { CLIENT_ROLE_CODE } from "../client-portal/client-portal.constants.js";
import type { RequestWithId } from "../request-context/request-with-id.js";
import {
  ACCOUNT_MANAGER_ROLE_CODE,
  SPECIALIST_ROLE_CODE,
  SUPERVISOR_ROLE_CODE,
} from "../requests/requests.constants.js";
import { MANAGE_REQUEST_TEMPLATES_PERMISSION } from "./request-templates.constants.js";
import {
  CreateFieldLibraryItemDto,
  RequestTemplateVersionStatusDto,
  UpdateFieldLibraryItemDto,
  UpsertRequestTemplateVersionDto,
} from "./request-templates.dto.js";
import { RequestTemplatesService } from "./request-templates.service.js";

function metadata(request: RequestWithId): RequestMetadata {
  const userAgent = request.header("user-agent");
  return {
    ...(request.requestId ? { requestId: request.requestId } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

@ApiTags("admin-request-templates")
@ApiCookieAuth()
@ApiExtraModels(
  CreateFieldLibraryItemDto,
  RequestTemplateVersionStatusDto,
  UpdateFieldLibraryItemDto,
  UpsertRequestTemplateVersionDto,
)
@RequireRoles(ADMIN_ROLE_CODE)
@RequirePermissions(MANAGE_REQUEST_TEMPLATES_PERMISSION)
@Controller("admin/request-templates")
export class AdminRequestTemplatesController {
  constructor(
    @Inject(RequestTemplatesService) private readonly requestTemplates: RequestTemplatesService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Return service item request template status and field library" })
  snapshot(@Req() request: RequestWithId) {
    return this.requestTemplates.snapshot(request.auth!.userId, metadata(request));
  }

  @Post("field-library")
  @ApiOperation({ summary: "Create a reusable request field library item" })
  createFieldLibraryItem(@Body() input: CreateFieldLibraryItemDto, @Req() request: RequestWithId) {
    return this.requestTemplates.createFieldLibraryItem(
      input,
      request.auth!.userId,
      metadata(request),
    );
  }

  @Put("field-library/:id")
  @ApiOperation({ summary: "Update or disable a reusable request field library item" })
  updateFieldLibraryItem(
    @Param("id") id: string,
    @Body() input: UpdateFieldLibraryItemDto,
    @Req() request: RequestWithId,
  ) {
    return this.requestTemplates.updateFieldLibraryItem(
      id,
      input,
      request.auth!.userId,
      metadata(request),
    );
  }

  @Post("service-items/:serviceItemId/apply-suggested")
  @ApiOperation({
    summary: "Apply a suggested service item request template as the active template",
  })
  applySuggested(@Param("serviceItemId") serviceItemId: string, @Req() request: RequestWithId) {
    return this.requestTemplates.applySuggested(
      serviceItemId,
      request.auth!.userId,
      metadata(request),
    );
  }

  @Put("service-items/:serviceItemId/template")
  @ApiOperation({ summary: "Create a new request template version for a service item" })
  upsertTemplateVersion(
    @Param("serviceItemId") serviceItemId: string,
    @Body() input: UpsertRequestTemplateVersionDto,
    @Req() request: RequestWithId,
  ) {
    return this.requestTemplates.upsertTemplateVersion(
      serviceItemId,
      input,
      request.auth!.userId,
      metadata(request),
    );
  }

  @Patch("templates/:templateId/versions/:versionId/status")
  @ApiOperation({ summary: "Activate or archive a request template version" })
  changeVersionStatus(
    @Param("templateId") templateId: string,
    @Param("versionId") versionId: string,
    @Body() input: RequestTemplateVersionStatusDto,
    @Req() request: RequestWithId,
  ) {
    return this.requestTemplates.changeVersionStatus(
      templateId,
      versionId,
      input,
      request.auth!.userId,
      metadata(request),
    );
  }
}

@ApiTags("request-templates")
@ApiCookieAuth()
@RequireRoles(
  ADMIN_ROLE_CODE,
  MANAGEMENT_ROLE_CODE,
  ACCOUNT_MANAGER_ROLE_CODE,
  SPECIALIST_ROLE_CODE,
  SUPERVISOR_ROLE_CODE,
  CLIENT_ROLE_CODE,
)
@Controller("request-templates")
export class RequestTemplatesController {
  constructor(
    @Inject(RequestTemplatesService) private readonly requestTemplates: RequestTemplatesService,
  ) {}

  @Get("service-item-revisions/:serviceItemRevisionId/active")
  @ApiOperation({ summary: "Return the active client-safe request template for a service item" })
  activeTemplate(
    @Param("serviceItemRevisionId") serviceItemRevisionId: string,
    @Req() request: RequestWithId,
  ) {
    return this.requestTemplates.activeTemplateForServiceItemRevision(
      serviceItemRevisionId,
      request.auth!,
      metadata(request),
    );
  }
}
