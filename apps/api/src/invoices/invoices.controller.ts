import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiExtraModels, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ADMIN_ROLE_CODE } from "../auth/auth.constants.js";
import { RequirePermissions, RequireRoles } from "../auth/auth.decorators.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import type { RequestWithId } from "../request-context/request-with-id.js";
import { ACCOUNT_MANAGER_ROLE_CODE, MANAGE_INVOICES_PERMISSION } from "./invoices.constants.js";
import { CreateInvoiceDto, InvoiceLifecycleActionDto, InvoiceStatusDto } from "./invoices.dto.js";
import { InvoicesService } from "./invoices.service.js";

function metadata(request: RequestWithId): RequestMetadata {
  const userAgent = request.header("user-agent");
  return {
    ...(request.requestId ? { requestId: request.requestId } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

@ApiTags("invoices")
@ApiCookieAuth()
@ApiExtraModels(CreateInvoiceDto, InvoiceLifecycleActionDto, InvoiceStatusDto)
@RequireRoles(ADMIN_ROLE_CODE, ACCOUNT_MANAGER_ROLE_CODE)
@RequirePermissions(MANAGE_INVOICES_PERMISSION)
@Controller("invoices")
export class InvoicesController {
  constructor(@Inject(InvoicesService) private readonly invoices: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: "List immutable invoices within the caller's client scope" })
  list(@Req() request: RequestWithId) {
    return this.invoices.list(request.auth!);
  }

  @Get(":id")
  @ApiOperation({ summary: "Retrieve an immutable invoice snapshot" })
  get(@Param("id") id: string, @Req() request: RequestWithId) {
    return this.invoices.get(id, request.auth!);
  }

  @Post()
  @ApiOperation({ summary: "Create an immutable invoice from an accepted quote snapshot" })
  create(@Body() input: CreateInvoiceDto, @Req() request: RequestWithId) {
    return this.invoices.create(input, request.auth!, metadata(request));
  }

  @Post(":id/issue")
  @HttpCode(200)
  @ApiOperation({ summary: "Issue a draft invoice without mutating its immutable snapshot" })
  issue(
    @Param("id") id: string,
    @Body() input: InvoiceLifecycleActionDto | undefined,
    @Req() request: RequestWithId,
  ) {
    return this.invoices.issue(id, input?.note, request.auth!, metadata(request));
  }

  @Post(":id/cancel")
  @HttpCode(200)
  @ApiOperation({ summary: "Cancel a draft invoice with optional notes" })
  cancel(
    @Param("id") id: string,
    @Body() input: InvoiceLifecycleActionDto | undefined,
    @Req() request: RequestWithId,
  ) {
    return this.invoices.cancel(id, input?.note, request.auth!, metadata(request));
  }

  @Post(":id/void")
  @HttpCode(200)
  @ApiOperation({ summary: "Void an issued invoice with optional notes" })
  voidInvoice(
    @Param("id") id: string,
    @Body() input: InvoiceLifecycleActionDto | undefined,
    @Req() request: RequestWithId,
  ) {
    return this.invoices.voidInvoice(id, input?.note, request.auth!, metadata(request));
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Advance invoice lifecycle without mutating snapshot content" })
  changeStatus(
    @Param("id") id: string,
    @Body() input: InvoiceStatusDto,
    @Req() request: RequestWithId,
  ) {
    return this.invoices.changeStatus(
      id,
      input.status,
      input.reason,
      request.auth!,
      metadata(request),
    );
  }
}
