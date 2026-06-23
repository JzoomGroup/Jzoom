import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import {
  CONFIG_REVISION_STATUSES,
  SETTING_VALUE_TYPES,
} from "./platform-configuration.constants.js";

export class JsonValueDto {
  @ApiProperty({ description: "JSON-compatible value.", type: Object })
  value!: unknown;
}

export class CreatePlatformSettingDto {
  @ApiProperty({ example: "platform.name", type: String })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  key!: string;

  @ApiProperty({ example: "platform", type: String })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  category!: string;

  @ApiProperty({ enum: SETTING_VALUE_TYPES })
  @IsIn(SETTING_VALUE_TYPES)
  valueType!: (typeof SETTING_VALUE_TYPES)[number];

  @ApiProperty({ type: Object })
  value!: unknown;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RevisePlatformSettingDto {
  @ApiProperty({ type: Object })
  value!: unknown;

  @ApiPropertyOptional({ enum: CONFIG_REVISION_STATUSES })
  @IsOptional()
  @IsIn(CONFIG_REVISION_STATUSES)
  revisionStatus?: (typeof CONFIG_REVISION_STATUSES)[number];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsString()
  effectiveFrom?: string;
}

export class ReviseNotificationTemplateDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  messageAr?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  messageEn?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  deepLink?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  recipients?: unknown;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  channels?: unknown;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  placeholders?: unknown;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  cadence?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  reminderRule?: string;

  @ApiPropertyOptional({ enum: CONFIG_REVISION_STATUSES })
  @IsOptional()
  @IsIn(CONFIG_REVISION_STATUSES)
  revisionStatus?: (typeof CONFIG_REVISION_STATUSES)[number];
}

export class RevisePdfTemplateDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  audience?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  mustInclude?: unknown;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  mustExclude?: unknown;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  languageDirection?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  technicalRule?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  contentSchema?: unknown;

  @ApiPropertyOptional({ enum: CONFIG_REVISION_STATUSES })
  @IsOptional()
  @IsIn(CONFIG_REVISION_STATUSES)
  revisionStatus?: (typeof CONFIG_REVISION_STATUSES)[number];
}

export class TranslationValueInputDto {
  @ApiProperty({ example: "common.save", type: String })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({ example: "common", type: String })
  @IsString()
  @IsNotEmpty()
  namespace!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: "ar", type: String })
  @IsString()
  @IsNotEmpty()
  locale!: string;

  @ApiProperty({ type: String })
  @IsString()
  value!: string;
}

export class PublishTranslationsDto {
  @ApiProperty({ type: [TranslationValueInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationValueInputDto)
  values!: TranslationValueInputDto[];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReviseWorkflowTemplateDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ type: Object })
  @IsObject()
  configuration!: Record<string, unknown>;

  @ApiPropertyOptional({ enum: CONFIG_REVISION_STATUSES })
  @IsOptional()
  @IsIn(CONFIG_REVISION_STATUSES)
  revisionStatus?: (typeof CONFIG_REVISION_STATUSES)[number];
}
