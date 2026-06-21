import { ApiProperty } from "@nestjs/swagger";

export class LivenessResponseDto {
  @ApiProperty({ enum: ["ok"], example: "ok", type: String })
  status!: "ok";

  @ApiProperty({ enum: ["api"], example: "api", type: String })
  service!: "api";

  @ApiProperty({ example: "2026-06-21T12:00:00.000Z", type: String })
  timestamp!: string;

  @ApiProperty({ example: 12.34, type: Number })
  uptimeSeconds!: number;
}

export class ReadinessResponseDto {
  @ApiProperty({ enum: ["ready"], example: "ready", type: String })
  status!: "ready";

  @ApiProperty({ enum: ["api"], example: "api", type: String })
  service!: "api";

  @ApiProperty({ enum: ["up"], example: "up", type: String })
  database!: "up";

  @ApiProperty({ example: "2026-06-21T12:00:00.000Z", type: String })
  timestamp!: string;
}
