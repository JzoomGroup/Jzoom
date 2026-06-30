import { Type } from "class-transformer";
import {
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
import { RequestTemplateAnswerInputDto } from "../request-templates/request-templates.dto.js";
import {
  CLIENT_DOCUMENT_REQUEST_STATUSES,
  REQUEST_OUTPUT_REVIEW_ACTIONS,
  REQUEST_PRIORITIES,
  REQUEST_QUEUE_TYPES,
  REQUEST_STATUSES,
  REQUEST_TASK_STATUSES,
  SUPERVISOR_REVIEW_ACTIONS,
  TIME_ENTRY_REVIEW_ACTIONS,
  TIME_ENTRY_STATUSES,
} from "./requests.constants.js";

const REQUEST_OUTPUT_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,79}$/;

export class CreateRequestDto {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  clientId!: string;

  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  subscriptionServiceId!: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  serviceItemRevisionId?: string;

  @ApiPropertyOptional({
    description: "Active request template version used for structured template answers.",
    type: String,
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  requestTemplateVersionId?: string;

  @ApiPropertyOptional({
    description: "Structured answers for the selected service item request template.",
    type: [RequestTemplateAnswerInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequestTemplateAnswerInputDto)
  templateAnswers?: RequestTemplateAnswerInputDto[];

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  sourceQuoteId?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  sourceInvoiceId?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  assignedSpecialistId?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  assignedSupervisorId?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  accountManagerId?: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(4_000)
  description!: string;

  @ApiPropertyOptional({ enum: REQUEST_PRIORITIES, default: "NORMAL" })
  @IsOptional()
  @IsIn(REQUEST_PRIORITIES)
  priority?: (typeof REQUEST_PRIORITIES)[number];

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class RequestStatusDto {
  @ApiProperty({ enum: REQUEST_STATUSES })
  @IsIn(REQUEST_STATUSES)
  status!: (typeof REQUEST_STATUSES)[number];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  reason?: string;
}

export class AssignRequestDto {
  @ApiPropertyOptional({ type: String, format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  assignedSpecialistId?: string | null;

  @ApiPropertyOptional({ type: String, format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  assignedSupervisorId?: string | null;

  @ApiPropertyOptional({ type: String, format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  accountManagerId?: string | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  reason?: string;
}

export class RequestQueueQueryDto {
  @ApiPropertyOptional({ enum: REQUEST_QUEUE_TYPES, default: "all" })
  @IsOptional()
  @IsIn(REQUEST_QUEUE_TYPES)
  queue?: (typeof REQUEST_QUEUE_TYPES)[number];

  @ApiPropertyOptional({ enum: REQUEST_STATUSES })
  @IsOptional()
  @IsIn(REQUEST_STATUSES)
  status?: (typeof REQUEST_STATUSES)[number];

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    description: "Monthly service or monthly service revision id.",
    type: String,
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ enum: REQUEST_PRIORITIES })
  @IsOptional()
  @IsIn(REQUEST_PRIORITIES)
  priority?: (typeof REQUEST_PRIORITIES)[number];

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  dueTo?: string;
}

export class SupervisorRequestReviewDto {
  @ApiProperty({ enum: SUPERVISOR_REVIEW_ACTIONS })
  @IsIn(SUPERVISOR_REVIEW_ACTIONS)
  action!: (typeof SUPERVISOR_REVIEW_ACTIONS)[number];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  reason?: string;
}

export class CreateRequestTaskDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @ApiPropertyOptional({ enum: REQUEST_TASK_STATUSES, default: "TODO" })
  @IsOptional()
  @IsIn(REQUEST_TASK_STATUSES)
  status?: (typeof REQUEST_TASK_STATUSES)[number];

  @ApiPropertyOptional({ enum: REQUEST_PRIORITIES, default: "NORMAL" })
  @IsOptional()
  @IsIn(REQUEST_PRIORITIES)
  priority?: (typeof REQUEST_PRIORITIES)[number];

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  sortOrder?: number;
}

export class UpdateRequestTaskDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string | null;

  @ApiPropertyOptional({ enum: REQUEST_TASK_STATUSES })
  @IsOptional()
  @IsIn(REQUEST_TASK_STATUSES)
  status?: (typeof REQUEST_TASK_STATUSES)[number];

  @ApiPropertyOptional({ enum: REQUEST_PRIORITIES })
  @IsOptional()
  @IsIn(REQUEST_PRIORITIES)
  priority?: (typeof REQUEST_PRIORITIES)[number];

  @ApiPropertyOptional({ type: String, format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  @IsOptional()
  @IsDateString()
  dueAt?: string | null;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  sortOrder?: number;
}

export class CreateRequestOutputDto {
  @ApiProperty({ type: String, example: "MONTHLY_REPORT" })
  @IsString()
  @Matches(REQUEST_OUTPUT_CODE_PATTERN)
  @MaxLength(80)
  code!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(4_000)
  description?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  contentSnapshot?: Record<string, unknown>;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  sortOrder?: number;
}

export class UpdateRequestOutputDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(4_000)
  description?: string | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  @IsOptional()
  @IsObject()
  contentSnapshot?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  @IsOptional()
  @IsDateString()
  dueAt?: string | null;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  sortOrder?: number;
}

export class ReviewRequestOutputDto {
  @ApiProperty({ enum: REQUEST_OUTPUT_REVIEW_ACTIONS })
  @IsIn(REQUEST_OUTPUT_REVIEW_ACTIONS)
  action!: (typeof REQUEST_OUTPUT_REVIEW_ACTIONS)[number];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  reason?: string;
}

export class ShareRequestOutputDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  reason?: string;
}

export class ReturnSharedOutputDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(2_000)
  reason!: string;
}

export class CloseRequestOutputDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  reason?: string;
}

export class RequestClientDocumentDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(4_000)
  instructions?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class UploadClientDocumentMetadataDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(260)
  originalName?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  mimeType?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  sizeBytes?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MinLength(64)
  @MaxLength(64)
  sha256?: string;
}

export class ClientDocumentRequestStatusDto {
  @ApiProperty({ enum: CLIENT_DOCUMENT_REQUEST_STATUSES })
  @IsIn(CLIENT_DOCUMENT_REQUEST_STATUSES)
  status!: (typeof CLIENT_DOCUMENT_REQUEST_STATUSES)[number];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  reason?: string;
}

export class CreateTimeEntryDto {
  @ApiProperty({ type: String, format: "date-time" })
  @IsDateString()
  workDate!: string;

  @ApiProperty({ type: Number, minimum: 0.01, maximum: 24 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(24)
  hours!: number;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  billable?: boolean;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  notes?: string;
}

export class UpdateTimeEntryDto {
  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  workDate?: string;

  @ApiPropertyOptional({ type: Number, minimum: 0.01, maximum: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(24)
  hours?: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  billable?: boolean;

  @ApiPropertyOptional({ enum: TIME_ENTRY_STATUSES })
  @IsOptional()
  @IsIn(TIME_ENTRY_STATUSES)
  status?: (typeof TIME_ENTRY_STATUSES)[number];

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  notes?: string | null;
}

export class ReviewTimeEntryDto {
  @ApiProperty({ enum: TIME_ENTRY_REVIEW_ACTIONS })
  @IsIn(TIME_ENTRY_REVIEW_ACTIONS)
  action!: (typeof TIME_ENTRY_REVIEW_ACTIONS)[number];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  reason?: string;
}

export class AddRequestCommentDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(4_000)
  body!: string;

  @ApiPropertyOptional({
    default: true,
    description: "Internal users may set false for internal-only comments.",
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  isClientVisible?: boolean;
}

export class AddInternalNoteDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(4_000)
  body!: string;
}

export class AddAttachmentMetadataDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(260)
  originalName!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  mimeType!: string;

  @ApiProperty({ type: Number, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  sizeBytes!: number;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(64)
  @MaxLength(64)
  sha256!: string;

  @ApiPropertyOptional({ enum: ["INTERNAL", "CLIENT_VISIBLE"], default: "INTERNAL" })
  @IsOptional()
  @IsIn(["INTERNAL", "CLIENT_VISIBLE"])
  visibility?: "INTERNAL" | "CLIENT_VISIBLE";
}
