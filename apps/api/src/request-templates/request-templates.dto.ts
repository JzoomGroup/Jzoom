import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  REQUEST_TEMPLATE_FIELD_TYPES,
  REQUEST_TEMPLATE_REVISION_STATUSES,
} from "./request-templates.constants.js";

export class CreateFieldLibraryItemDto {
  @ApiProperty({ type: String, example: "employee_name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  code!: string;

  @ApiProperty({ enum: REQUEST_TEMPLATE_FIELD_TYPES })
  @IsIn(REQUEST_TEMPLATE_FIELD_TYPES)
  fieldType!: (typeof REQUEST_TEMPLATE_FIELD_TYPES)[number];

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  labelAr!: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  labelEn!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  helpTextAr?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  helpTextEn?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  systemKey?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  defaultConfig?: unknown;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 100_000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  sortOrder?: number;
}

export class UpdateFieldLibraryItemDto {
  @ApiPropertyOptional({ enum: REQUEST_TEMPLATE_FIELD_TYPES })
  @IsOptional()
  @IsIn(REQUEST_TEMPLATE_FIELD_TYPES)
  fieldType?: (typeof REQUEST_TEMPLATE_FIELD_TYPES)[number];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  labelAr?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  labelEn?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  helpTextAr?: string | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  helpTextEn?: string | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  systemKey?: string | null;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  defaultConfig?: unknown;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class TemplateSectionInputDto {
  @ApiProperty({ type: String, example: "basic_request_information" })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  titleAr!: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  titleEn!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class TemplateOptionInputDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  value!: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  labelAr!: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  labelEn!: string;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class TemplateFieldInputDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  sectionCode?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  libraryFieldCode?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  systemKey?: string;

  @ApiProperty({ enum: REQUEST_TEMPLATE_FIELD_TYPES })
  @IsIn(REQUEST_TEMPLATE_FIELD_TYPES)
  fieldType!: (typeof REQUEST_TEMPLATE_FIELD_TYPES)[number];

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  labelAr!: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  labelEn!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  helpTextAr?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  helpTextEn?: string;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  clientVisible?: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  defaultValue?: unknown;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  validation?: unknown;

  @ApiPropertyOptional({ type: [TemplateOptionInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateOptionInputDto)
  options?: TemplateOptionInputDto[];

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class TemplateFileInputDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  titleAr!: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  titleEn!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  storageKey?: string;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  returnUploadRequired?: boolean;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  clientVisible?: boolean;

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class TemplateDocumentInputDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  labelAr!: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  labelEn!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  uploadRequired?: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  acceptedFileTypes?: unknown;

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpsertRequestTemplateVersionDto {
  @ApiPropertyOptional({ enum: REQUEST_TEMPLATE_REVISION_STATUSES, default: "DRAFT" })
  @IsOptional()
  @IsIn(REQUEST_TEMPLATE_REVISION_STATUSES)
  status?: (typeof REQUEST_TEMPLATE_REVISION_STATUSES)[number];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  instructionsAr?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  instructionsEn?: string;

  @ApiProperty({ type: [TemplateSectionInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateSectionInputDto)
  sections!: TemplateSectionInputDto[];

  @ApiProperty({ type: [TemplateFieldInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateFieldInputDto)
  fields!: TemplateFieldInputDto[];

  @ApiPropertyOptional({ type: [TemplateFileInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateFileInputDto)
  downloadableFiles?: TemplateFileInputDto[];

  @ApiPropertyOptional({ type: [TemplateDocumentInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateDocumentInputDto)
  documentChecklist?: TemplateDocumentInputDto[];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RequestTemplateVersionStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "ARCHIVED"] })
  @IsIn(["ACTIVE", "ARCHIVED"])
  status!: "ACTIVE" | "ARCHIVED";

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RequestTemplateAnswerInputDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  fieldCode!: string;

  @ApiProperty({ type: Object })
  value!: unknown;
}
