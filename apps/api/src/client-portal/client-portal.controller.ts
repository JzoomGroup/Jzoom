import { Controller, Get, Inject, Param, Req, Res, StreamableFile } from "@nestjs/common";
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { RequireRoles } from "../auth/auth.decorators.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import type { RequestWithId } from "../request-context/request-with-id.js";
import { CLIENT_ROLE_CODE } from "./client-portal.constants.js";
import { ClientPortalService } from "./client-portal.service.js";

function metadata(request: RequestWithId): RequestMetadata {
  const userAgent = request.header("user-agent");
  return {
    ...(request.requestId ? { requestId: request.requestId } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

@ApiTags("client-portal")
@ApiCookieAuth()
@RequireRoles(CLIENT_ROLE_CODE)
@Controller("client-portal")
export class ClientPortalController {
  constructor(@Inject(ClientPortalService) private readonly portal: ClientPortalService) {}

  @Get("me")
  @ApiOperation({ summary: "Return the current client portal account context" })
  me(@Req() request: RequestWithId) {
    return this.portal.profile(request.auth!);
  }

  @Get("quotes")
  @ApiOperation({ summary: "List issued and accepted quotes scoped to the client account" })
  quotes(@Req() request: RequestWithId) {
    return this.portal.listQuotes(request.auth!);
  }

  @Get("quotes/:id")
  @ApiOperation({ summary: "Retrieve a client-safe immutable quote snapshot" })
  quote(@Param("id") id: string, @Req() request: RequestWithId) {
    return this.portal.getQuote(id, request.auth!, metadata(request));
  }

  @Get("quotes/:id/pdf")
  @ApiOperation({ summary: "Download a quote PDF from the immutable client-safe snapshot" })
  @ApiProduces("application/pdf")
  @ApiOkResponse({
    content: {
      "application/pdf": {
        schema: { type: "string", format: "binary" },
      },
    },
    description: "A4 quote PDF generated from the stored quote snapshot",
  })
  async quotePdf(
    @Param("id") id: string,
    @Req() request: RequestWithId,
    @Res({ passthrough: true }) response: Response,
  ) {
    const pdf = await this.portal.generateQuotePdf(id, request.auth!, metadata(request));
    response.setHeader("Content-Type", pdf.contentType);
    response.setHeader("Content-Length", String(pdf.byteLength));
    response.setHeader("Content-Disposition", `inline; filename="${pdf.filename}"`);
    response.setHeader("Cache-Control", "private, no-store");
    return new StreamableFile(pdf.bytes);
  }

  @Get("invoices")
  @ApiOperation({ summary: "List issued invoices scoped to the client account" })
  invoices(@Req() request: RequestWithId) {
    return this.portal.listInvoices(request.auth!);
  }

  @Get("invoices/:id")
  @ApiOperation({ summary: "Retrieve a client-safe immutable invoice snapshot" })
  invoice(@Param("id") id: string, @Req() request: RequestWithId) {
    return this.portal.getInvoice(id, request.auth!, metadata(request));
  }

  @Get("invoices/:id/pdf")
  @ApiOperation({ summary: "Download an invoice PDF from the immutable client-safe snapshot" })
  @ApiProduces("application/pdf")
  @ApiOkResponse({
    content: {
      "application/pdf": {
        schema: { type: "string", format: "binary" },
      },
    },
    description: "A4 invoice PDF generated from the stored invoice snapshot",
  })
  async invoicePdf(
    @Param("id") id: string,
    @Req() request: RequestWithId,
    @Res({ passthrough: true }) response: Response,
  ) {
    const pdf = await this.portal.generateInvoicePdf(id, request.auth!, metadata(request));
    response.setHeader("Content-Type", pdf.contentType);
    response.setHeader("Content-Length", String(pdf.byteLength));
    response.setHeader("Content-Disposition", `inline; filename="${pdf.filename}"`);
    response.setHeader("Cache-Control", "private, no-store");
    return new StreamableFile(pdf.bytes);
  }
}
