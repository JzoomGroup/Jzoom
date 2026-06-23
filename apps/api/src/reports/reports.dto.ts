import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Matches } from "class-validator";

export class MonthlyReportQueryDto {
  @ApiPropertyOptional({ example: "2026-06", type: String })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  period?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  clientId?: string;
}

export class PrepareMonthlyReportDto {
  @ApiProperty({ type: String })
  @IsString()
  clientId!: string;

  @ApiProperty({ example: "2026-06", type: String })
  @Matches(/^\d{4}-\d{2}$/)
  period!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  title?: string;
}
