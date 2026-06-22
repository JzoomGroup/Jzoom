import { Module } from "@nestjs/common";
import { InvoicesModule } from "../invoices/invoices.module.js";
import { QuotesModule } from "../quotes/quotes.module.js";
import { ClientPortalController } from "./client-portal.controller.js";
import { ClientPortalService } from "./client-portal.service.js";

@Module({
  imports: [QuotesModule, InvoicesModule],
  controllers: [ClientPortalController],
  providers: [ClientPortalService],
})
export class ClientPortalModule {}
