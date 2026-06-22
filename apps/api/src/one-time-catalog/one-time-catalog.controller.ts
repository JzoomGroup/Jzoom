import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from "@nestjs/common";
import { ApiCookieAuth, ApiExtraModels, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ADMIN_ROLE_CODE } from "../auth/auth.constants.js";
import { RequirePermissions, RequireRoles } from "../auth/auth.decorators.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import type { RequestWithId } from "../request-context/request-with-id.js";
import { MANAGE_ONE_TIME_SERVICES_PERMISSION } from "./one-time-catalog.constants.js";
import {
  ArchiveCatalogEntryDto,
  CatalogStatusDto,
  CreateOneTimeCategoryDto,
  CreateOneTimeServiceDto,
  OneTimeDeliverableDto,
  OneTimePhaseDto,
  OneTimeTaskDto,
  OneTimeTemplateDto,
  ReorderCatalogEntryDto,
  UpdateOneTimeCategoryDto,
  UpdateOneTimeServiceDto,
} from "./one-time-catalog.dto.js";
import { OneTimeCatalogService } from "./one-time-catalog.service.js";

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
  CreateOneTimeCategoryDto,
  CreateOneTimeServiceDto,
  OneTimeDeliverableDto,
  OneTimePhaseDto,
  OneTimeTaskDto,
  OneTimeTemplateDto,
  ReorderCatalogEntryDto,
  UpdateOneTimeCategoryDto,
  UpdateOneTimeServiceDto,
] as const;

@ApiTags("admin-one-time-catalog")
@ApiCookieAuth()
@ApiExtraModels(...documentedModels)
@RequireRoles(ADMIN_ROLE_CODE)
@RequirePermissions(MANAGE_ONE_TIME_SERVICES_PERMISSION)
@Controller("admin/catalog/one-time")
export class AdminOneTimeCatalogController {
  constructor(
    @Inject(OneTimeCatalogService)
    private readonly catalog: OneTimeCatalogService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Return the complete Admin one-time catalog snapshot" })
  getSnapshot() {
    return this.catalog.getSnapshot();
  }

  @Post("categories")
  createCategory(@Body() input: CreateOneTimeCategoryDto, @Req() request: RequestWithId) {
    return this.catalog.createCategory(input, request.auth!.userId, metadata(request));
  }

  @Put("categories/:id")
  updateCategory(
    @Param("id") id: string,
    @Body() input: UpdateOneTimeCategoryDto,
    @Req() request: RequestWithId,
  ) {
    return this.catalog.updateCategory(id, input, request.auth!.userId, metadata(request));
  }

  @Patch("categories/:id/status")
  changeCategoryStatus(
    @Param("id") id: string,
    @Body() input: CatalogStatusDto,
    @Req() request: RequestWithId,
  ) {
    return this.catalog.changeCategoryStatus(
      id,
      input.status,
      input.reason,
      request.auth!.userId,
      metadata(request),
    );
  }

  @Patch("categories/:id/order")
  reorderCategory(
    @Param("id") id: string,
    @Body() input: ReorderCatalogEntryDto,
    @Req() request: RequestWithId,
  ) {
    return this.catalog.reorderCategory(
      id,
      input.sortOrder,
      request.auth!.userId,
      metadata(request),
    );
  }

  @Post("categories/:id/archive")
  archiveCategory(
    @Param("id") id: string,
    @Body() input: ArchiveCatalogEntryDto,
    @Req() request: RequestWithId,
  ) {
    return this.catalog.changeCategoryStatus(
      id,
      "ARCHIVED",
      input.reason,
      request.auth!.userId,
      metadata(request),
    );
  }

  @Delete("categories/:id")
  deleteCategory() {
    return this.catalog.rejectDelete();
  }
}

@ApiTags("admin-one-time-catalog")
@ApiCookieAuth()
@ApiExtraModels(...documentedModels)
@RequireRoles(ADMIN_ROLE_CODE)
@RequirePermissions(MANAGE_ONE_TIME_SERVICES_PERMISSION)
@Controller("services/one-time")
export class OneTimeServicesController {
  constructor(
    @Inject(OneTimeCatalogService)
    private readonly catalog: OneTimeCatalogService,
  ) {}

  @Get()
  async list() {
    return (await this.catalog.getSnapshot()).services;
  }

  @Post()
  create(@Body() input: CreateOneTimeServiceDto, @Req() request: RequestWithId) {
    return this.catalog.createService(input, request.auth!.userId, metadata(request));
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Body() input: UpdateOneTimeServiceDto,
    @Req() request: RequestWithId,
  ) {
    return this.catalog.updateService(id, input, request.auth!.userId, metadata(request));
  }

  @Put(":id/template")
  updateTemplate(
    @Param("id") id: string,
    @Body() input: OneTimeTemplateDto,
    @Req() request: RequestWithId,
  ) {
    return this.catalog.updateTemplate(id, input, request.auth!.userId, metadata(request));
  }

  @Patch(":id/status")
  changeStatus(
    @Param("id") id: string,
    @Body() input: CatalogStatusDto,
    @Req() request: RequestWithId,
  ) {
    return this.catalog.changeServiceStatus(
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
    return this.catalog.reorderService(
      id,
      input.sortOrder,
      request.auth!.userId,
      metadata(request),
    );
  }

  @Post(":id/archive")
  archive(
    @Param("id") id: string,
    @Body() input: ArchiveCatalogEntryDto,
    @Req() request: RequestWithId,
  ) {
    return this.catalog.changeServiceStatus(
      id,
      "ARCHIVED",
      input.reason,
      request.auth!.userId,
      metadata(request),
    );
  }

  @Delete(":id")
  delete() {
    return this.catalog.rejectDelete();
  }
}
