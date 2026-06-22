import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CATALOG_CODE_PATTERN } from "../catalog-admin/catalog.constants.js";
import {
  ArchiveCatalogEntryDto,
  CatalogStatusDto,
  ReorderCatalogEntryDto,
} from "../catalog-admin/catalog.dto.js";
import {
  PRICING_CALCULATION_METHODS,
  PRICING_RULE_TYPES,
  PRICING_TARGET_TYPES,
} from "./pricing.constants.js";

export { ArchiveCatalogEntryDto, CatalogStatusDto, ReorderCatalogEntryDto };

class PricingRuleRevisionFieldsDto {
  @ApiProperty({ enum: PRICING_RULE_TYPES })
  @IsIn(PRICING_RULE_TYPES)
  ruleType!: (typeof PRICING_RULE_TYPES)[number];

  @ApiProperty({ enum: PRICING_CALCULATION_METHODS })
  @IsIn(PRICING_CALCULATION_METHODS)
  calculationMethod!: (typeof PRICING_CALCULATION_METHODS)[number];

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1_000_000_000)
  value?: number;

  @ApiPropertyOptional({ type: String, default: "SAR" })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiProperty({ enum: PRICING_TARGET_TYPES })
  @IsIn(PRICING_TARGET_TYPES)
  targetType!: (typeof PRICING_TARGET_TYPES)[number];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @Matches(CATALOG_CODE_PATTERN)
  @MaxLength(80)
  targetCode?: string;

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  priority?: number;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  isStackable?: boolean;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(4_000)
  formulaOrRule!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  appliesTo!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  implementationOwner?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  visibility?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>;

  @ApiProperty({ type: String, format: "date-time" })
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional({ enum: ["DRAFT", "ACTIVE"], default: "DRAFT" })
  @IsOptional()
  @IsIn(["DRAFT", "ACTIVE"])
  revisionStatus?: "DRAFT" | "ACTIVE";
}

export class CreatePricingRuleDto extends PricingRuleRevisionFieldsDto {
  @ApiProperty({ type: String, example: "PRICE-TAX-STANDARD" })
  @IsString()
  @Matches(CATALOG_CODE_PATTERN)
  @MaxLength(80)
  code!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ enum: ["DRAFT", "ACTIVE"], default: "DRAFT" })
  @IsOptional()
  @IsIn(["DRAFT", "ACTIVE"])
  status?: "DRAFT" | "ACTIVE";

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  sortOrder?: number;
}

export class UpdatePricingRuleDto extends PricingRuleRevisionFieldsDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

export class MonthlyPricingSelectionDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  monthlyServiceRevisionId!: string;

  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  serviceLevelId!: string;

  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(10_000)
  quantity?: number;
}

export class OneTimePricingSelectionDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  oneTimeServiceRevisionId!: string;

  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(10_000)
  quantity?: number;
}

export class PricingInputDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  clientId!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(4_000)
  notes?: string;

  @ApiProperty({ type: String, format: "date-time" })
  @IsDateString()
  pricingDate!: string;

  @ApiPropertyOptional({ type: String, default: "SAR" })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiProperty({ type: [MonthlyPricingSelectionDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => MonthlyPricingSelectionDto)
  monthlySelections!: MonthlyPricingSelectionDto[];

  @ApiProperty({ type: [OneTimePricingSelectionDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => OneTimePricingSelectionDto)
  oneTimeSelections!: OneTimePricingSelectionDto[];
}
