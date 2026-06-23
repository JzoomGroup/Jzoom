import { Body, Controller, Get, Inject, Param, Post, Put, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiExtraModels, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ADMIN_ROLE_CODE } from "../auth/auth.constants.js";
import { RequirePermissions, RequireRoles } from "../auth/auth.decorators.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import type { RequestWithId } from "../request-context/request-with-id.js";
import { MANAGE_PLATFORM_CONFIGURATION_PERMISSION } from "./platform-configuration.constants.js";
import {
  CreatePlatformSettingDto,
  PublishTranslationsDto,
  ReviseNotificationTemplateDto,
  RevisePdfTemplateDto,
  RevisePlatformSettingDto,
  ReviseWorkflowTemplateDto,
} from "./platform-configuration.dto.js";
import { PlatformConfigurationService } from "./platform-configuration.service.js";

function metadata(request: RequestWithId): RequestMetadata {
  const userAgent = request.header("user-agent");
  return {
    ...(request.requestId ? { requestId: request.requestId } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

@ApiTags("admin-platform-configuration")
@ApiCookieAuth()
@ApiExtraModels(
  CreatePlatformSettingDto,
  PublishTranslationsDto,
  ReviseNotificationTemplateDto,
  RevisePdfTemplateDto,
  RevisePlatformSettingDto,
  ReviseWorkflowTemplateDto,
)
@RequireRoles(ADMIN_ROLE_CODE)
@RequirePermissions(MANAGE_PLATFORM_CONFIGURATION_PERMISSION)
@Controller("admin/platform-configuration")
export class PlatformConfigurationController {
  constructor(
    @Inject(PlatformConfigurationService)
    private readonly configuration: PlatformConfigurationService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Return Admin-managed platform settings and template foundations" })
  snapshot(@Req() request: RequestWithId): Promise<unknown> {
    return this.configuration.snapshot(request.auth!.userId, metadata(request));
  }

  @Post("settings")
  @ApiOperation({ summary: "Create an Admin-managed platform setting" })
  createSetting(
    @Body() input: CreatePlatformSettingDto,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.configuration.createSetting(input, request.auth!.userId, metadata(request));
  }

  @Put("settings/:key")
  @ApiOperation({ summary: "Create a new revision for a platform setting" })
  reviseSetting(
    @Param("key") key: string,
    @Body() input: RevisePlatformSettingDto,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.configuration.reviseSetting(key, input, request.auth!.userId, metadata(request));
  }

  @Put("notifications/:id")
  @ApiOperation({ summary: "Create a new notification template revision" })
  reviseNotificationTemplate(
    @Param("id") id: string,
    @Body() input: ReviseNotificationTemplateDto,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.configuration.reviseNotificationTemplate(
      id,
      input,
      request.auth!.userId,
      metadata(request),
    );
  }

  @Put("pdfs/:id")
  @ApiOperation({ summary: "Create a new quote or invoice PDF template settings revision" })
  revisePdfTemplate(
    @Param("id") id: string,
    @Body() input: RevisePdfTemplateDto,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.configuration.revisePdfTemplate(id, input, request.auth!.userId, metadata(request));
  }

  @Post("localization/publish")
  @ApiOperation({ summary: "Publish a new localization label revision" })
  publishTranslations(
    @Body() input: PublishTranslationsDto,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.configuration.publishTranslations(input, request.auth!.userId, metadata(request));
  }

  @Put("workflows/:id")
  @ApiOperation({ summary: "Create a simple workflow/checklist template revision" })
  reviseWorkflowTemplate(
    @Param("id") id: string,
    @Body() input: ReviseWorkflowTemplateDto,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.configuration.reviseWorkflowTemplate(
      id,
      input,
      request.auth!.userId,
      metadata(request),
    );
  }
}
