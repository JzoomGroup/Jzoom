import { Body, Controller, Get, Inject, Param, Patch, Post, Put, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiExtraModels, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ADMIN_ROLE_CODE } from "../auth/auth.constants.js";
import { RequirePermissions, RequireRoles } from "../auth/auth.decorators.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import type { RequestWithId } from "../request-context/request-with-id.js";
import {
  ACCOUNT_MANAGER_ROLE_CODE,
  MANAGE_PRICING_RULES_PERMISSION,
  USE_PRICING_STUDIO_PERMISSION,
} from "./pricing.constants.js";
import {
  ArchiveCatalogEntryDto,
  CatalogStatusDto,
  CreatePricingRuleDto,
  PricingInputDto,
  ReorderCatalogEntryDto,
  UpdatePricingRuleDto,
} from "./pricing.dto.js";
import { PricingService } from "./pricing.service.js";

function metadata(request: RequestWithId): RequestMetadata {
  const userAgent = request.header("user-agent");
  return {
    ...(request.requestId ? { requestId: request.requestId } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

const documentedModels = [
  ArchiveCatalogEntryDto,
  CatalogStatusDto,
  CreatePricingRuleDto,
  PricingInputDto,
  ReorderCatalogEntryDto,
  UpdatePricingRuleDto,
] as const;

@ApiTags("admin-pricing-rules")
@ApiCookieAuth()
@ApiExtraModels(...documentedModels)
@RequireRoles(ADMIN_ROLE_CODE)
@RequirePermissions(MANAGE_PRICING_RULES_PERMISSION)
@Controller("admin/pricing-rules")
export class AdminPricingRulesController {
  constructor(@Inject(PricingService) private readonly pricing: PricingService) {}

  @Get()
  @ApiOperation({ summary: "Return versioned Admin pricing-rule configuration" })
  getRules() {
    return this.pricing.getAdminRules();
  }

  @Post()
  create(@Body() input: CreatePricingRuleDto, @Req() request: RequestWithId) {
    return this.pricing.createRule(input, request.auth!.userId, metadata(request));
  }

  @Put(":id")
  revise(
    @Param("id") id: string,
    @Body() input: UpdatePricingRuleDto,
    @Req() request: RequestWithId,
  ) {
    return this.pricing.reviseRule(id, input, request.auth!.userId, metadata(request));
  }

  @Patch(":id/status")
  changeStatus(
    @Param("id") id: string,
    @Body() input: CatalogStatusDto,
    @Req() request: RequestWithId,
  ) {
    return this.pricing.changeRuleStatus(
      id,
      input.status,
      input.reason,
      request.auth!.userId,
      metadata(request),
    );
  }

  @Patch(":id/order")
  reorder(
    @Param("id") id: string,
    @Body() input: ReorderCatalogEntryDto,
    @Req() request: RequestWithId,
  ) {
    return this.pricing.reorderRule(id, input.sortOrder, request.auth!.userId, metadata(request));
  }

  @Post(":id/archive")
  archive(
    @Param("id") id: string,
    @Body() input: ArchiveCatalogEntryDto,
    @Req() request: RequestWithId,
  ) {
    return this.pricing.changeRuleStatus(
      id,
      "ARCHIVED",
      input.reason,
      request.auth!.userId,
      metadata(request),
    );
  }
}

@ApiTags("pricing-studio")
@ApiCookieAuth()
@ApiExtraModels(...documentedModels)
@RequireRoles(ADMIN_ROLE_CODE, ACCOUNT_MANAGER_ROLE_CODE)
@RequirePermissions(USE_PRICING_STUDIO_PERMISSION)
@Controller("pricing")
export class PricingStudioController {
  constructor(@Inject(PricingService) private readonly pricing: PricingService) {}

  @Get("catalog")
  @ApiOperation({ summary: "Return scoped clients and currently selectable catalog revisions" })
  getCatalog(@Req() request: RequestWithId) {
    return this.pricing.getStudioCatalog(request.auth!);
  }

  @Get("drafts")
  listDrafts(@Req() request: RequestWithId) {
    return this.pricing.listDrafts(request.auth!);
  }

  @Get("drafts/:id")
  getDraft(@Param("id") id: string, @Req() request: RequestWithId) {
    return this.pricing.getDraft(id, request.auth!);
  }

  @Post("preview")
  preview(@Body() input: PricingInputDto, @Req() request: RequestWithId) {
    return this.pricing.preview(input, request.auth!, metadata(request));
  }

  @Post("drafts")
  createDraft(@Body() input: PricingInputDto, @Req() request: RequestWithId) {
    return this.pricing.createDraft(input, request.auth!, metadata(request));
  }

  @Put("drafts/:id")
  updateDraft(
    @Param("id") id: string,
    @Body() input: PricingInputDto,
    @Req() request: RequestWithId,
  ) {
    return this.pricing.updateDraft(id, input, request.auth!, metadata(request));
  }

  @Post("drafts/:id/archive")
  archiveDraft(
    @Param("id") id: string,
    @Body() input: ArchiveCatalogEntryDto,
    @Req() request: RequestWithId,
  ) {
    return this.pricing.archiveDraft(id, input.reason, request.auth!, metadata(request));
  }
}
