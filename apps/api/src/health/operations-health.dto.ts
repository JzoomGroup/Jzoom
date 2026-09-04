import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class OutboxOperationsStatusDto {
  @ApiProperty({ type: Number })
  pending!: number;

  @ApiProperty({ type: Number })
  ready!: number;

  @ApiProperty({ type: Number })
  scheduledForRetry!: number;

  @ApiProperty({ type: Number })
  inFlight!: number;

  @ApiProperty({ type: Number })
  maxAttemptCount!: number;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  oldestPendingAt!: string | null;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  lastProcessedAt!: string | null;
}

export class OperationsHealthResponseDto {
  @ApiProperty({ type: String, enum: ["ok", "attention"] })
  status!: "attention" | "ok";

  @ApiProperty({ type: String, format: "date-time" })
  timestamp!: string;

  @ApiProperty({ type: OutboxOperationsStatusDto })
  outbox!: OutboxOperationsStatusDto;
}
