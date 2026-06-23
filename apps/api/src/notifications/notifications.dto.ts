import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import { Transform } from "class-transformer";

export const notificationReadStates = ["all", "read", "unread"] as const;

export class NotificationListQueryDto {
  @ApiPropertyOptional({ enum: notificationReadStates, default: "all", type: String })
  @IsOptional()
  @IsIn(notificationReadStates)
  readState?: (typeof notificationReadStates)[number];

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100, type: Number })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
