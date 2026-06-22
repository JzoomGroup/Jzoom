import { Type } from "class-transformer";
import {
  IsBoolean,
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
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { REQUEST_PRIORITIES, REQUEST_STATUSES } from "./requests.constants.js";

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
