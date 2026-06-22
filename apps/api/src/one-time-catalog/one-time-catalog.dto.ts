import { Type } from "class-transformer";
import {
  ArrayMaxSize,
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
import {
  ArchiveCatalogEntryDto,
  CatalogStatusDto,
  ReorderCatalogEntryDto,
  catalogStatuses,
  type CatalogLifecycleStatus,
} from "../catalog-admin/catalog.dto.js";
import { CATALOG_CODE_PATTERN } from "../catalog-admin/catalog.constants.js";
import { ONE_TIME_SERVICE_PATHS } from "./one-time-catalog.constants.js";

export { ArchiveCatalogEntryDto, CatalogStatusDto, ReorderCatalogEntryDto };

class OneTimeCategoryFieldsDto {
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

export class CreateOneTimeCategoryDto extends OneTimeCategoryFieldsDto {
  @ApiProperty({ type: String, example: "OT-CAT-BUILD" })
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

export class UpdateOneTimeCategoryDto extends OneTimeCategoryFieldsDto {}

export class OneTimePhaseDto {
  @ApiProperty({ type: String, example: "PHASE-DISCOVERY" })
  @IsString()
  @Matches(CATALOG_CODE_PATTERN)
  @MaxLength(80)
  code!: string;

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
  @MaxLength(2_000)
  description?: string;

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  sortOrder?: number;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ enum: catalogStatuses, default: "ACTIVE" })
  @IsOptional()
  @IsIn(catalogStatuses)
  status?: CatalogLifecycleStatus;
}

export class OneTimeTaskDto {
  @ApiProperty({ type: String, example: "TASK-WIREFRAME" })
  @IsString()
  @Matches(CATALOG_CODE_PATTERN)
  @MaxLength(80)
  code!: string;

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
  @MaxLength(2_000)
  description?: string;

  @ApiProperty({ type: Number, minimum: 0, maximum: 100_000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000)
  estimatedHours!: number;

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  sortOrder?: number;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ enum: catalogStatuses, default: "ACTIVE" })
  @IsOptional()
  @IsIn(catalogStatuses)
  status?: CatalogLifecycleStatus;
}

export class OneTimeDeliverableDto {
  @ApiProperty({ type: String, example: "DEL-BRAND-GUIDE" })
  @IsString()
  @Matches(CATALOG_CODE_PATTERN)
  @MaxLength(80)
  code!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(CATALOG_CODE_PATTERN)
  @MaxLength(80)
  phaseCode?: string;

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
  @MaxLength(2_000)
  description?: string;

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  sortOrder?: number;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  requiresClientApproval?: boolean;

  @ApiPropertyOptional({ enum: catalogStatuses, default: "ACTIVE" })
  @IsOptional()
  @IsIn(catalogStatuses)
  status?: CatalogLifecycleStatus;

  @ApiProperty({ type: () => [OneTimeTaskDto] })
  @IsArray()
  @ArrayMaxSize(250)
  @ValidateNested({ each: true })
  @Type(() => OneTimeTaskDto)
  tasks!: OneTimeTaskDto[];
}

export class OneTimeTemplateDto {
  @ApiProperty({ type: () => [OneTimePhaseDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OneTimePhaseDto)
  phases!: OneTimePhaseDto[];

  @ApiProperty({ type: () => [OneTimeDeliverableDto] })
  @IsArray()
  @ArrayMaxSize(250)
  @ValidateNested({ each: true })
  @Type(() => OneTimeDeliverableDto)
  deliverables!: OneTimeDeliverableDto[];
}

class OneTimeServiceFieldsDto extends OneTimeTemplateDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ enum: ONE_TIME_SERVICE_PATHS })
  @IsIn(ONE_TIME_SERVICE_PATHS)
  serviceLine!: (typeof ONE_TIME_SERVICE_PATHS)[number];

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
  @MaxLength(4_000)
  description!: string;

  @ApiProperty({ type: Number, minimum: 0, maximum: 100_000_000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000_000)
  basePriceSar!: number;

  @ApiProperty({ type: Number, minimum: 0, maximum: 100_000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000)
  estimatedHours!: number;

  @ApiProperty({ type: Number, minimum: 0, maximum: 1_000_000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  internalHourlyCostSar!: number;

  @ApiProperty({ type: Number, minimum: 0, maximum: 3_650 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3_650)
  durationDays!: number;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  visibleInPricing?: boolean;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  createsProject?: boolean;
}

export class CreateOneTimeServiceDto extends OneTimeServiceFieldsDto {
  @ApiProperty({ type: String, example: "OT-BUILD-WEBSITE" })
  @IsString()
  @Matches(CATALOG_CODE_PATTERN)
  @MaxLength(80)
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

export class UpdateOneTimeServiceDto extends OneTimeServiceFieldsDto {}
