import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import {
  MANAGE_MONTHLY_SERVICES_PERMISSION,
  MANAGE_SERVICE_ITEMS_PERMISSION,
  MANAGE_SERVICE_LEVELS_PERMISSION,
} from "./catalog.constants.js";
import {
  ArchiveCatalogEntryDto,
  CatalogStatusDto,
  CreateMonthlyCategoryDto,
  CreateMonthlyServiceDto,
  CreateServiceItemDto,
  CreateServiceLevelDto,
  ReorderCatalogEntryDto,
  ReplaceServiceItemInclusionsDto,
  UpdateMonthlyCategoryDto,
  UpdateMonthlyServiceDto,
  UpdateServiceItemDto,
  UpdateServiceLevelDto,
} from "./catalog.dto.js";
import { CatalogService } from "./catalog.service.js";

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
  CreateMonthlyCategoryDto,
  CreateMonthlyServiceDto,
  CreateServiceItemDto,
  CreateServiceLevelDto,
  ReorderCatalogEntryDto,
  ReplaceServiceItemInclusionsDto,
  UpdateMonthlyCategoryDto,
  UpdateMonthlyServiceDto,
  UpdateServiceItemDto,
  UpdateServiceLevelDto,
] as const;

@ApiTags("admin-monthly-catalog")
@ApiCookieAuth()
@ApiExtraModels(...documentedModels)
@RequireRoles(ADMIN_ROLE_CODE)
@RequirePermissions(MANAGE_MONTHLY_SERVICES_PERMISSION)
@Controller("admin/catalog")
export class AdminCatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get()
  @ApiOperation({ summary: "Return the complete Admin monthly catalog snapshot" })
  getSnapshot() {
    return this.catalog.getSnapshot();
  }

  @Post("categories")
  createCategory(@Body() input: CreateMonthlyCategoryDto, @Req() request: RequestWithId) {
    return this.catalog.createCategory(input, request.auth!.userId, metadata(request));
  }

  @Put("categories/:id")
  updateCategory(
    @Param("id") id: string,
    @Body() input: UpdateMonthlyCategoryDto,
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

@ApiTags("admin-monthly-catalog")
@ApiCookieAuth()
@ApiExtraModels(...documentedModels)
@RequireRoles(ADMIN_ROLE_CODE)
@RequirePermissions(MANAGE_MONTHLY_SERVICES_PERMISSION)
@Controller("services/monthly")
export class MonthlyServicesController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get()
  async list() {
    return (await this.catalog.getSnapshot()).services;
  }

  @Post()
  create(@Body() input: CreateMonthlyServiceDto, @Req() request: RequestWithId) {
    return this.catalog.createMonthlyService(input, request.auth!.userId, metadata(request));
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Body() input: UpdateMonthlyServiceDto,
    @Req() request: RequestWithId,
  ) {
    return this.catalog.updateMonthlyService(id, input, request.auth!.userId, metadata(request));
  }

  @Patch(":id/status")
  changeStatus(
    @Param("id") id: string,
    @Body() input: CatalogStatusDto,
    @Req() request: RequestWithId,
  ) {
    return this.catalog.changeMonthlyServiceStatus(
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
    return this.catalog.reorderMonthlyService(
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
    return this.catalog.changeMonthlyServiceStatus(
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

@ApiTags("admin-monthly-catalog")
@ApiCookieAuth()
@ApiExtraModels(...documentedModels)
@RequireRoles(ADMIN_ROLE_CODE)
@RequirePermissions(MANAGE_SERVICE_ITEMS_PERMISSION)
@Controller("service-items")
export class ServiceItemsController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get()
  async list() {
    return (await this.catalog.getSnapshot()).items;
  }

  @Post()
  create(@Body() input: CreateServiceItemDto, @Req() request: RequestWithId) {
    return this.catalog.createServiceItem(input, request.auth!.userId, metadata(request));
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Body() input: UpdateServiceItemDto,
    @Req() request: RequestWithId,
  ) {
    return this.catalog.updateServiceItem(id, input, request.auth!.userId, metadata(request));
  }

  @Put(":id/levels")
  replaceLevels(
    @Param("id") id: string,
    @Body() input: ReplaceServiceItemInclusionsDto,
    @Req() request: RequestWithId,
  ) {
    return this.catalog.replaceServiceItemInclusions(
      id,
      input.levelInclusions,
      request.auth!.userId,
      metadata(request),
    );
  }

  @Patch(":id/status")
  changeStatus(
    @Param("id") id: string,
    @Body() input: CatalogStatusDto,
    @Req() request: RequestWithId,
  ) {
    return this.catalog.changeServiceItemStatus(
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
    return this.catalog.reorderServiceItem(
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
    return this.catalog.changeServiceItemStatus(
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

@ApiTags("admin-monthly-catalog")
@ApiCookieAuth()
@ApiExtraModels(...documentedModels)
@RequireRoles(ADMIN_ROLE_CODE)
@RequirePermissions(MANAGE_SERVICE_LEVELS_PERMISSION)
@Controller("service-levels")
export class ServiceLevelsController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get()
  async list() {
    return (await this.catalog.getSnapshot()).levels;
  }

  @Post()
  create(@Body() input: CreateServiceLevelDto, @Req() request: RequestWithId) {
    return this.catalog.createServiceLevel(input, request.auth!.userId, metadata(request));
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Body() input: UpdateServiceLevelDto,
    @Req() request: RequestWithId,
  ) {
    return this.catalog.updateServiceLevel(id, input, request.auth!.userId, metadata(request));
  }

  @Patch(":id/status")
  changeStatus(
    @Param("id") id: string,
    @Body() input: CatalogStatusDto,
    @Req() request: RequestWithId,
  ) {
    return this.catalog.changeServiceLevelStatus(
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
    return this.catalog.reorderServiceLevel(
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
    return this.catalog.changeServiceLevelStatus(
      id,
      "ARCHIVED",
      input.reason,
      request.auth!.userId,
      metadata(request),
    );
  }

  @Delete(":id")
  @HttpCode(409)
  delete() {
    return this.catalog.rejectDelete();
  }
}
