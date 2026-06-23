import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiExtraModels, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ADMIN_ROLE_CODE, MANAGEMENT_ROLE_CODE } from "../auth/auth.constants.js";
import { RequireRoles } from "../auth/auth.decorators.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import type { RequestWithId } from "../request-context/request-with-id.js";
import { ACCOUNT_MANAGER_ROLE_CODE, CLIENT_ROLE_CODE } from "./reports.constants.js";
import { MonthlyReportQueryDto, PrepareMonthlyReportDto } from "./reports.dto.js";
import { ReportsService } from "./reports.service.js";

function metadata(request: RequestWithId): RequestMetadata {
  const userAgent = request.header("user-agent");
  return {
    ...(request.requestId ? { requestId: request.requestId } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

@ApiTags("reports")
@ApiCookieAuth()
@ApiExtraModels(MonthlyReportQueryDto, PrepareMonthlyReportDto)
@RequireRoles(ADMIN_ROLE_CODE, MANAGEMENT_ROLE_CODE, ACCOUNT_MANAGER_ROLE_CODE)
@Controller("reports")
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reports: ReportsService) {}

  @Get("monthly")
  @ApiOperation({ summary: "List prepared monthly reports within the internal client scope" })
  listMonthly(@Query() query: MonthlyReportQueryDto, @Req() request: RequestWithId) {
    return this.reports.listMonthlyReports(query, request.auth!);
  }

  @Post("monthly/prepare")
  @HttpCode(200)
  @ApiOperation({ summary: "Prepare or refresh a client monthly report snapshot" })
  prepareMonthly(@Body() input: PrepareMonthlyReportDto, @Req() request: RequestWithId) {
    return this.reports.prepareMonthlyReport(input, request.auth!, metadata(request));
  }

  @Get("monthly/:id")
  @ApiOperation({ summary: "Retrieve an internal monthly report preparation view" })
  getMonthly(@Param("id") id: string, @Req() request: RequestWithId) {
    return this.reports.getMonthlyReport(id, request.auth!, metadata(request));
  }

  @Post("monthly/:id/publish")
  @HttpCode(200)
  @ApiOperation({ summary: "Publish a prepared monthly report to client portal users" })
  publishMonthly(@Param("id") id: string, @Req() request: RequestWithId) {
    return this.reports.publishMonthlyReport(id, request.auth!, metadata(request));
  }
}

@ApiTags("client-portal")
@ApiCookieAuth()
@RequireRoles(CLIENT_ROLE_CODE)
@Controller("client-portal/reports")
export class ClientReportsController {
  constructor(@Inject(ReportsService) private readonly reports: ReportsService) {}

  @Get()
  @ApiOperation({ summary: "List published monthly reports for the client account" })
  listClientReports(@Req() request: RequestWithId) {
    return this.reports.listClientReports(request.auth!);
  }

  @Get(":id")
  @ApiOperation({ summary: "Retrieve a client-safe published monthly report" })
  getClientReport(@Param("id") id: string, @Req() request: RequestWithId) {
    return this.reports.getClientReport(id, request.auth!, metadata(request));
  }
}

@ApiTags("account-manager")
@ApiCookieAuth()
@RequireRoles(ADMIN_ROLE_CODE, MANAGEMENT_ROLE_CODE, ACCOUNT_MANAGER_ROLE_CODE)
@Controller("account-manager")
export class AccountManagerController {
  constructor(@Inject(ReportsService) private readonly reports: ReportsService) {}

  @Get("portfolio")
  @ApiOperation({ summary: "Return the account-manager portfolio foundation view" })
  portfolio(@Req() request: RequestWithId) {
    return this.reports.accountManagerPortfolio(request.auth!, metadata(request));
  }
}
