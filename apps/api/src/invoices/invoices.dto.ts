import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { INVOICE_PUBLIC_STATUSES } from "./invoices.constants.js";

export class CreateInvoiceDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  quoteId!: string;
}

export class InvoiceStatusDto {
  @ApiProperty({ enum: INVOICE_PUBLIC_STATUSES })
  @IsIn(INVOICE_PUBLIC_STATUSES)
  status!: (typeof INVOICE_PUBLIC_STATUSES)[number];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  reason?: string;
}

export class InvoiceLifecycleActionDto {
  @ApiPropertyOptional({
    description: "Optional internal note for the invoice lifecycle decision.",
    type: String,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  note?: string;
}
