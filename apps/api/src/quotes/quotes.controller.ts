import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  Res,
  StreamableFile,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import { ADMIN_ROLE_CODE } from "../auth/auth.constants.js";
import { RequirePermissions, RequireRoles } from "../auth/auth.decorators.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import type { RequestWithId } from "../request-context/request-with-id.js";
import { ACCOUNT_MANAGER_ROLE_CODE, MANAGE_QUOTES_PERMISSION } from "./quotes.constants.js";
import {
  CreateQuoteDto,
  QuoteLifecycleActionDto,
  QuoteStatusDto,
  QuoteTermsDto,
} from "./quotes.dto.js";
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
@ApiExtraModels(CreateQuoteDto, QuoteLifecycleActionDto, QuoteStatusDto, QuoteTermsDto)
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

  @Get(":id/pdf")
  @ApiOperation({ summary: "Generate a quote PDF from the immutable quote snapshot" })
  @ApiProduces("application/pdf")
  @ApiOkResponse({
    content: {
      "application/pdf": {
        schema: { type: "string", format: "binary" },
      },
    },
    description: "A4 quote PDF generated from the stored quote snapshot",
  })
  async pdf(
    @Param("id") id: string,
    @Req() request: RequestWithId,
    @Res({ passthrough: true }) response: Response,
  ) {
    const pdf = await this.quotes.generatePdf(id, request.auth!, metadata(request));
    response.setHeader("Content-Type", pdf.contentType);
    response.setHeader("Content-Length", String(pdf.byteLength));
    response.setHeader("Content-Disposition", `inline; filename="${pdf.filename}"`);
    response.setHeader("Cache-Control", "private, no-store");
    return new StreamableFile(pdf.bytes);
  }

  @Post()
  @ApiOperation({ summary: "Create an immutable quote from a saved pricing draft" })
  create(@Body() input: CreateQuoteDto, @Req() request: RequestWithId) {
    return this.quotes.create(input, request.auth!, metadata(request));
  }

  @Post(":id/accept")
  @HttpCode(200)
  @ApiOperation({ summary: "Accept an issued quote without mutating its immutable snapshot" })
  accept(
    @Param("id") id: string,
    @Body() input: QuoteLifecycleActionDto | undefined,
    @Req() request: RequestWithId,
  ) {
    return this.quotes.accept(id, input?.note, request.auth!, metadata(request));
  }

  @Post(":id/reject")
  @HttpCode(200)
  @ApiOperation({ summary: "Reject an issued quote with optional notes" })
  reject(
    @Param("id") id: string,
    @Body() input: QuoteLifecycleActionDto | undefined,
    @Req() request: RequestWithId,
  ) {
    return this.quotes.reject(id, input?.note, request.auth!, metadata(request));
  }

  @Post(":id/expire")
  @HttpCode(200)
  @ApiOperation({ summary: "Mark an issued quote as expired" })
  expire(
    @Param("id") id: string,
    @Body() input: QuoteLifecycleActionDto | undefined,
    @Req() request: RequestWithId,
  ) {
    return this.quotes.expire(id, input?.note, request.auth!, metadata(request));
  }

  @Post(":id/cancel")
  @HttpCode(200)
  @ApiOperation({ summary: "Cancel a draft or issued quote with optional notes" })
  cancel(
    @Param("id") id: string,
    @Body() input: QuoteLifecycleActionDto | undefined,
    @Req() request: RequestWithId,
  ) {
    return this.quotes.cancel(id, input?.note, request.auth!, metadata(request));
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
