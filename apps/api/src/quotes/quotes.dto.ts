import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsDateString,
  IsArray,
  IsEmail,
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

export class QuoteOnboardingPortalUserDto {
  @ApiProperty({ type: String, example: "client@example.com" })
  @IsEmail()
  @IsString()
  @MinLength(3)
  @MaxLength(254)
  email!: string;

  @ApiProperty({ type: String, example: "Client User" })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  displayName!: string;

  @ApiPropertyOptional({ enum: ["ar", "en"], default: "ar" })
  @IsOptional()
  @IsIn(["ar", "en"])
  preferredLocale?: "ar" | "en";
}

export class QuoteOnboardingServiceAssignmentDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  quoteItemId!: string;

  @ApiPropertyOptional({ type: [String], format: "uuid" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID(undefined, { each: true })
  specialistIds?: string[];
}

export class QuoteOnboardingDto {
  @ApiPropertyOptional({ type: QuoteOnboardingPortalUserDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuoteOnboardingPortalUserDto)
  portalUser?: QuoteOnboardingPortalUserDto;

  @ApiPropertyOptional({ type: [QuoteOnboardingServiceAssignmentDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => QuoteOnboardingServiceAssignmentDto)
  serviceAssignments?: QuoteOnboardingServiceAssignmentDto[];
}
