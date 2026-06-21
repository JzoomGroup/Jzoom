import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
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
import { CATALOG_CODE_PATTERN } from "./catalog.constants.js";

export const catalogStatuses = ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type CatalogLifecycleStatus = (typeof catalogStatuses)[number];

export class CatalogStatusDto {
  @ApiProperty({ enum: catalogStatuses })
  @IsIn(catalogStatuses)
  status!: CatalogLifecycleStatus;

  @ApiPropertyOptional({ type: String, minLength: 3, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}

export class ReorderCatalogEntryDto {
  @ApiProperty({ type: Number, minimum: 0, maximum: 100_000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  sortOrder!: number;
}

export class ArchiveCatalogEntryDto {
  @ApiProperty({ type: String, minLength: 3, maxLength: 500 })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class CreateMonthlyCategoryDto {
  @ApiProperty({ type: String, example: "CAT-HR" })
  @IsString()
  @Matches(CATALOG_CODE_PATTERN)
  @MaxLength(60)
  code!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  nameAr!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  nameEn!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

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

export class UpdateMonthlyCategoryDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  nameAr!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  nameEn!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;
}

export class ServiceLevelConfigDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  serviceLevelId!: string;

  @ApiProperty({ type: Number, minimum: 0, maximum: 100_000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000)
  hours!: number;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 8_760 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(8_760)
  slaHours?: number;

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  isEnabled!: boolean;

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  sortOrder?: number;
}

class MonthlyServiceFieldsDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nameAr!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nameEn!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(5_000)
  description!: string;

  @ApiProperty({ type: Number, minimum: 0, maximum: 1_000_000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  sellingHourlyRateSar!: number;

  @ApiProperty({ type: Number, minimum: 0, maximum: 1_000_000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  internalHourlyCostSar!: number;

  @ApiProperty({ type: Number, minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  setupFeePct!: number;

  @ApiProperty({ type: Number, minimum: 0, maximum: 8_760 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(8_760)
  defaultSlaHours!: number;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  visibleInPricing?: boolean;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  deductHours?: boolean;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  requiresSupervisor?: boolean;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  requiresManagement?: boolean;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  clientApprovalRequired?: boolean;

  @ApiProperty({ type: [ServiceLevelConfigDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ServiceLevelConfigDto)
  levelConfigs!: ServiceLevelConfigDto[];
}

export class CreateMonthlyServiceDto extends MonthlyServiceFieldsDto {
  @ApiProperty({ type: String, example: "MS-HR" })
  @IsString()
  @Matches(CATALOG_CODE_PATTERN)
  @MaxLength(60)
  code!: string;

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

export class UpdateMonthlyServiceDto extends MonthlyServiceFieldsDto {}

export class ServiceItemInclusionDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  serviceLevelId!: string;

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  included!: boolean;

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  sortOrder?: number;
}

class ServiceItemFieldsDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nameAr!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nameEn!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(5_000)
  expectedOutput?: string;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  visibleInQuote?: boolean;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  requiresFile?: boolean;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  deductHours?: boolean;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  requestType?: string;

  @ApiProperty({ type: [ServiceItemInclusionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ServiceItemInclusionDto)
  levelInclusions!: ServiceItemInclusionDto[];
}

export class CreateServiceItemDto extends ServiceItemFieldsDto {
  @ApiProperty({ type: String, example: "ITEM-HR-ONBOARDING" })
  @IsString()
  @Matches(CATALOG_CODE_PATTERN)
  @MaxLength(80)
  code!: string;

  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  monthlyServiceId!: string;

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

export class UpdateServiceItemDto extends ServiceItemFieldsDto {}

export class ReplaceServiceItemInclusionsDto {
  @ApiProperty({ type: [ServiceItemInclusionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ServiceItemInclusionDto)
  levelInclusions!: ServiceItemInclusionDto[];
}

class ServiceLevelFieldsDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  labelAr!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  labelEn!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  purpose?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  slaRule?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  scopeRule?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  governanceRule?: string;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  isCustom?: boolean;
}

export class CreateServiceLevelDto extends ServiceLevelFieldsDto {
  @ApiProperty({ type: String, example: "Enterprise" })
  @IsString()
  @Matches(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/)
  @MaxLength(60)
  code!: string;

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

export class UpdateServiceLevelDto extends ServiceLevelFieldsDto {}
