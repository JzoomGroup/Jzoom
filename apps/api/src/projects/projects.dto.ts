import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import {
  PROJECT_CLIENT_OUTPUT_DECISION_STATUSES,
  PROJECT_OUTPUT_STATUSES,
  PROJECT_STATUSES,
  PROJECT_TASK_STATUSES,
  type ProjectLifecycleStatus,
} from "./projects.constants.js";

export class ProjectStatusDto {
  @ApiProperty({ enum: PROJECT_STATUSES })
  @IsIn(PROJECT_STATUSES)
  status!: ProjectLifecycleStatus;

  @ApiPropertyOptional({ type: String, minLength: 3, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}

export class UpdateProjectTaskDto {
  @ApiProperty({ enum: PROJECT_TASK_STATUSES })
  @IsIn(PROJECT_TASK_STATUSES)
  status!: (typeof PROJECT_TASK_STATUSES)[number];

  @ApiPropertyOptional({ type: String, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class CreateProjectOutputDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional({ type: String, maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  code?: string;

  @ApiPropertyOptional({ type: String, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class ProjectOutputStatusDto {
  @ApiProperty({ enum: PROJECT_OUTPUT_STATUSES })
  @IsIn(PROJECT_OUTPUT_STATUSES)
  status!: (typeof PROJECT_OUTPUT_STATUSES)[number];

  @ApiPropertyOptional({ type: String, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ClientProjectOutputDecisionDto {
  @ApiProperty({ enum: PROJECT_CLIENT_OUTPUT_DECISION_STATUSES })
  @IsIn(PROJECT_CLIENT_OUTPUT_DECISION_STATUSES)
  status!: (typeof PROJECT_CLIENT_OUTPUT_DECISION_STATUSES)[number];

  @ApiPropertyOptional({ type: String, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
