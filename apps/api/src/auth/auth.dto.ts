import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export class LoginDto {
  @ApiProperty({ type: String, example: "person@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ type: String, format: "password", minLength: 8 })
  @IsString()
  @MaxLength(256)
  password!: string;
}

export class PasswordResetRequestDto {
  @ApiProperty({ type: String, example: "person@example.com" })
  @IsEmail()
  email!: string;
}

export class PasswordResetConfirmDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(20)
  token!: string;

  @ApiProperty({ type: String, format: "password", minLength: 8 })
  @Matches(PASSWORD_PATTERN, {
    message: "password must contain upper-case, lower-case, and numeric characters",
  })
  @MaxLength(256)
  password!: string;
}

export class AcceptInvitationDto extends PasswordResetConfirmDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName?: string;
}

export class InviteUserDto {
  @ApiProperty({ type: String, example: "person@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName!: string;

  @ApiProperty({ type: String, enum: ["INTERNAL", "EXTERNAL"] })
  @IsIn(["INTERNAL", "EXTERNAL"])
  userType!: "INTERNAL" | "EXTERNAL";

  @ApiProperty({ type: [String], example: ["ROLE-SPECIALIST"] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  roleCodes!: string[];
}

export class OperatingUserScopeDto {
  @ApiPropertyOptional({ type: [String], format: "uuid" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  clientIds?: string[];

  @ApiPropertyOptional({ type: [String], format: "uuid" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  monthlyServiceIds?: string[];

  @ApiPropertyOptional({ type: [String], format: "uuid" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID(undefined, { each: true })
  serviceItemIds?: string[];

  @ApiPropertyOptional({ type: [String], format: "uuid" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  oneTimeServiceIds?: string[];

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  supervisorId?: string;

  @ApiPropertyOptional({ type: [String], format: "uuid" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  specialistIds?: string[];
}

export class CreateOperatingUserDto extends OperatingUserScopeDto {
  @ApiProperty({ type: String, example: "person@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName!: string;

  @ApiProperty({
    type: String,
    enum: [
      "ROLE-SPECIALIST",
      "ROLE-PROJECT-SPECIALIST",
      "ROLE-SUPERVISOR",
      "ROLE-AM",
      "ROLE-MGMT",
      "ROLE-ADMIN",
    ],
  })
  @IsIn([
    "ROLE-SPECIALIST",
    "ROLE-PROJECT-SPECIALIST",
    "ROLE-SUPERVISOR",
    "ROLE-AM",
    "ROLE-MGMT",
    "ROLE-ADMIN",
  ])
  roleCode!:
    | "ROLE-SPECIALIST"
    | "ROLE-PROJECT-SPECIALIST"
    | "ROLE-SUPERVISOR"
    | "ROLE-AM"
    | "ROLE-MGMT"
    | "ROLE-ADMIN";
}

export class UpdateOperatingUserScopeDto extends OperatingUserScopeDto {}

export class UpdateUserStatusDto {
  @ApiProperty({ type: String, enum: ["ACTIVE", "DISABLED", "ARCHIVED"] })
  @IsIn(["ACTIVE", "DISABLED", "ARCHIVED"])
  status!: "ACTIVE" | "DISABLED" | "ARCHIVED";
}

export class UpdateAdminUserProfileDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName!: string;

  @ApiProperty({ type: String, example: "person@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ type: String, enum: ["ar", "en"] })
  @IsIn(["ar", "en"])
  preferredLocale!: "ar" | "en";
}

export class UpdateProfilePreferencesDto {
  @ApiProperty({ type: String, enum: ["ar", "en"] })
  @IsIn(["ar", "en"])
  preferredLocale!: "ar" | "en";
}

export class ChangePasswordDto {
  @ApiProperty({ type: String, format: "password", minLength: 8 })
  @Matches(PASSWORD_PATTERN, {
    message: "newPassword must contain upper-case, lower-case, and numeric characters",
  })
  @MaxLength(256)
  newPassword!: string;

  @ApiProperty({ type: String, format: "password", minLength: 8 })
  @Matches(PASSWORD_PATTERN, {
    message: "confirmPassword must contain upper-case, lower-case, and numeric characters",
  })
  @MaxLength(256)
  confirmPassword!: string;
}

export class ReplaceUserRolesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  roleCodes!: string[];
}

export class ReplaceRolePermissionsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  permissionCodes!: string[];
}

export class UserPermissionOverrideDto {
  @ApiProperty({ type: String })
  @IsString()
  permissionCode!: string;

  @ApiProperty({ type: String, enum: ["ALLOW", "DENY"] })
  @IsIn(["ALLOW", "DENY"])
  effect!: "ALLOW" | "DENY";

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class ReplaceUserPermissionOverridesDto {
  @ApiProperty({ type: [UserPermissionOverrideDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => UserPermissionOverrideDto)
  overrides!: UserPermissionOverrideDto[];
}

export class UserIdParamDto {
  @IsUUID()
  userId!: string;
}
