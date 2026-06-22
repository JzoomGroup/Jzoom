import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { QUOTE_PUBLIC_STATUSES } from "./quotes.constants.js";

export class QuoteTermsDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(2_000)
  paymentTerms!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  deliveryTerms?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(4_000)
  additionalTerms?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  clientNotes?: string;
}

export class CreateQuoteDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  pricingDraftId!: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 365, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  validityDays?: number;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiProperty({ type: QuoteTermsDto })
  @ValidateNested()
  @Type(() => QuoteTermsDto)
  terms!: QuoteTermsDto;
}

export class QuoteStatusDto {
  @ApiProperty({ enum: QUOTE_PUBLIC_STATUSES })
  @IsIn(QUOTE_PUBLIC_STATUSES)
  status!: (typeof QUOTE_PUBLIC_STATUSES)[number];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  reason?: string;
}

export class QuoteLifecycleActionDto {
  @ApiPropertyOptional({
    description: "Optional internal note for the lifecycle decision.",
    type: String,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  note?: string;
}
