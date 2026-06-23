import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiExtraModels, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequireRoles } from "../auth/auth.decorators.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import type { RequestWithId } from "../request-context/request-with-id.js";
import { HOURS_LEDGER_CLOSING_ROLES, HOURS_LEDGER_VIEW_ROLES } from "./hours-ledger.constants.js";
import {
  HoursLedgerQueryDto,
  MonthlyClosingQueryDto,
  MonthlyUsageQueryDto,
  PrepareMonthlyClosingDto,
} from "./hours-ledger.dto.js";
import { HoursLedgerService } from "./hours-ledger.service.js";

function metadata(request: RequestWithId): RequestMetadata {
  const userAgent = request.header("user-agent");
  return {
    ...(request.requestId ? { requestId: request.requestId } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

@ApiTags("hours-ledger")
@ApiCookieAuth()
@ApiExtraModels(
  HoursLedgerQueryDto,
  MonthlyClosingQueryDto,
  MonthlyUsageQueryDto,
  PrepareMonthlyClosingDto,
)
@Controller("hours-ledger")
export class HoursLedgerController {
  constructor(@Inject(HoursLedgerService) private readonly hoursLedger: HoursLedgerService) {}

  @Get()
  @RequireRoles(...HOURS_LEDGER_VIEW_ROLES)
  @ApiOperation({ summary: "List internal hours ledger entries and grouped month totals" })
  list(@Query() query: HoursLedgerQueryDto, @Req() request: RequestWithId): Promise<unknown> {
    return this.hoursLedger.list(query, request.auth!, metadata(request));
  }

  @Get("usage")
  @RequireRoles(...HOURS_LEDGER_VIEW_ROLES)
  @ApiOperation({ summary: "Return monthly usage summaries by client" })
  usage(@Query() query: MonthlyUsageQueryDto, @Req() request: RequestWithId): Promise<unknown> {
    return this.hoursLedger.usage(query, request.auth!, metadata(request));
  }

  @Get("closings")
  @RequireRoles(...HOURS_LEDGER_CLOSING_ROLES)
  @ApiOperation({ summary: "List monthly closing drafts and finalized snapshots" })
  closings(
    @Query() query: MonthlyClosingQueryDto,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.hoursLedger.listClosings(query, request.auth!);
  }

  @Post("closings/prepare")
  @HttpCode(200)
  @RequireRoles(...HOURS_LEDGER_CLOSING_ROLES)
  @ApiOperation({ summary: "Prepare or refresh a client monthly closing draft" })
  prepareClosing(
    @Body() input: PrepareMonthlyClosingDto,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.hoursLedger.prepareClosing(input, request.auth!, metadata(request));
  }

  @Get("closings/:id")
  @RequireRoles(...HOURS_LEDGER_CLOSING_ROLES)
  @ApiOperation({ summary: "Retrieve an internal monthly closing snapshot" })
  getClosing(@Param("id") id: string, @Req() request: RequestWithId): Promise<unknown> {
    return this.hoursLedger.getClosing(id, request.auth!, metadata(request));
  }

  @Post("closings/:id/finalize")
  @HttpCode(200)
  @RequireRoles(...HOURS_LEDGER_CLOSING_ROLES)
  @ApiOperation({ summary: "Finalize and lock a monthly closing snapshot" })
  finalizeClosing(@Param("id") id: string, @Req() request: RequestWithId): Promise<unknown> {
    return this.hoursLedger.finalizeClosing(id, request.auth!, metadata(request));
  }
}
