import { Module } from "@nestjs/common";
import { QuotePdfService } from "./quote-pdf.service.js";
import { QuotesController } from "./quotes.controller.js";
import { QuotesService } from "./quotes.service.js";

@Module({
  controllers: [QuotesController],
  providers: [QuotePdfService, QuotesService],
})
export class QuotesModule {}
