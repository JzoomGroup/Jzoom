import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module.js";
import { QuotePdfService } from "./quote-pdf.service.js";
import { QuotesController } from "./quotes.controller.js";
import { QuotesService } from "./quotes.service.js";

@Module({
  imports: [ProjectsModule],
  controllers: [QuotesController],
  providers: [QuotePdfService, QuotesService],
  exports: [QuotePdfService],
})
export class QuotesModule {}
