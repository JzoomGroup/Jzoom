import { Type } from "class-transformer";
import {
  IsIn,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CATALOG_CODE_PATTERN } from "../catalog-admin/catalog.constants.js";

export const clientStatuses = ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type ClientLifecycleStatus = (typeof clientStatuses)[number];

class ClientFieldsDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  commercialRegistration?: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  sector!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 1_000_000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  employeesCount?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 100_000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  branchesCount?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  transactionVolume?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  operationalComplexity?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  dataReadiness?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  urgency?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  billingContact?: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  authorizedApprover!: string;
}

export class CreateClientDto extends ClientFieldsDto {
  @ApiProperty({ type: String, example: "CLIENT-001" })
  @IsString()
  @Matches(CATALOG_CODE_PATTERN)
  @MaxLength(60)
  code!: string;

  @ApiPropertyOptional({ enum: ["DRAFT", "ACTIVE"], default: "ACTIVE" })
  @IsOptional()
  @IsIn(["DRAFT", "ACTIVE"])
  status?: "DRAFT" | "ACTIVE";
}

export class UpdateClientDto extends ClientFieldsDto {}

export class ClientStatusDto {
  @ApiProperty({ enum: clientStatuses })
  @IsIn(clientStatuses)
  status!: ClientLifecycleStatus;

  @ApiPropertyOptional({ type: String, minLength: 3, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}

export class ArchiveClientDto {
  @ApiProperty({ type: String, minLength: 3, maxLength: 500 })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class CreateClientPortalUserDto {
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

  @ApiProperty({ type: String, minLength: 8, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password?: string;

  @ApiPropertyOptional({ enum: ["ar", "en"], default: "ar" })
  @IsOptional()
  @IsIn(["ar", "en"])
  preferredLocale?: "ar" | "en";
}
