import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, Matches } from "class-validator";
import {
  LEDGER_TRACKED_TIME_ENTRY_STATUSES,
  MONTHLY_CLOSING_STATUSES,
} from "./hours-ledger.constants.js";

export class HoursLedgerQueryDto {
  @ApiPropertyOptional({ example: "2026-06", type: String })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  period?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ enum: LEDGER_TRACKED_TIME_ENTRY_STATUSES })
  @IsOptional()
  @IsIn(LEDGER_TRACKED_TIME_ENTRY_STATUSES)
  status?: (typeof LEDGER_TRACKED_TIME_ENTRY_STATUSES)[number];

  @ApiPropertyOptional({ enum: ["true", "false"] })
  @IsOptional()
  @IsIn(["true", "false"])
  billable?: "true" | "false";
}

export class MonthlyUsageQueryDto {
  @ApiPropertyOptional({ example: "2026-06", type: String })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  period?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  clientId?: string;
}

export class MonthlyClosingQueryDto {
  @ApiPropertyOptional({ example: "2026-06", type: String })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  period?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ enum: MONTHLY_CLOSING_STATUSES })
  @IsOptional()
  @IsIn(MONTHLY_CLOSING_STATUSES)
  status?: (typeof MONTHLY_CLOSING_STATUSES)[number];
}

export class PrepareMonthlyClosingDto {
  @ApiProperty({ type: String })
  @IsString()
  clientId!: string;

  @ApiProperty({ example: "2026-06", type: String })
  @Matches(/^\d{4}-\d{2}$/)
  period!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  title?: string;
}
