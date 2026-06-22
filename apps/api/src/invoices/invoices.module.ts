import { Module } from "@nestjs/common";
import { InvoicePdfService } from "./invoice-pdf.service.js";
import { InvoicesController } from "./invoices.controller.js";
import { InvoicesService } from "./invoices.service.js";

@Module({
  controllers: [InvoicesController],
  providers: [InvoicePdfService, InvoicesService],
  exports: [InvoicePdfService],
})
export class InvoicesModule {}
