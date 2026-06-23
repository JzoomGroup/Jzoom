import { Module } from "@nestjs/common";
import { HoursLedgerController } from "./hours-ledger.controller.js";
import { HoursLedgerService } from "./hours-ledger.service.js";

@Module({
  controllers: [HoursLedgerController],
  providers: [HoursLedgerService],
})
export class HoursLedgerModule {}
