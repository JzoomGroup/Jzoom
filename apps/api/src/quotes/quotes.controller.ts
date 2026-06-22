import { Body, Controller, Get, Inject, Param, Patch, Post, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiExtraModels, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ADMIN_ROLE_CODE } from "../auth/auth.constants.js";
import { RequirePermissions, RequireRoles } from "../auth/auth.decorators.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import type { RequestWithId } from "../request-context/request-with-id.js";
import { ACCOUNT_MANAGER_ROLE_CODE, MANAGE_QUOTES_PERMISSION } from "./quotes.constants.js";
import { CreateQuoteDto, QuoteStatusDto, QuoteTermsDto } from "./quotes.dto.js";
import { QuotesService } from "./quotes.service.js";

function metadata(request: RequestWithId): RequestMetadata {
  const userAgent = request.header("user-agent");
  return {
    ...(request.requestId ? { requestId: request.requestId } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

@ApiTags("quotes")
@ApiCookieAuth()
@ApiExtraModels(CreateQuoteDto, QuoteStatusDto, QuoteTermsDto)
@RequireRoles(ADMIN_ROLE_CODE, ACCOUNT_MANAGER_ROLE_CODE)
@RequirePermissions(MANAGE_QUOTES_PERMISSION)
@Controller("quotes")
export class QuotesController {
  constructor(@Inject(QuotesService) private readonly quotes: QuotesService) {}

  @Get()
  @ApiOperation({ summary: "List immutable quotes within the caller's client scope" })
  list(@Req() request: RequestWithId) {
    return this.quotes.list(request.auth!);
  }

  @Get(":id")
  @ApiOperation({ summary: "Retrieve an immutable quote snapshot" })
  get(@Param("id") id: string, @Req() request: RequestWithId) {
    return this.quotes.get(id, request.auth!);
  }

  @Post()
  @ApiOperation({ summary: "Create an immutable quote from a saved pricing draft" })
  create(@Body() input: CreateQuoteDto, @Req() request: RequestWithId) {
    return this.quotes.create(input, request.auth!, metadata(request));
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Advance quote lifecycle without mutating snapshot content" })
  changeStatus(
    @Param("id") id: string,
    @Body() input: QuoteStatusDto,
    @Req() request: RequestWithId,
  ) {
    return this.quotes.changeStatus(
      id,
      input.status,
      input.reason,
      request.auth!,
      metadata(request),
    );
  }
}
