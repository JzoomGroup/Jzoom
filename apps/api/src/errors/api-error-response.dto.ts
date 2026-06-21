import { ApiProperty } from "@nestjs/swagger";
import type { ApiErrorResponse, ApiFieldError } from "@jzoom/contracts";

export class ApiFieldErrorDto implements ApiFieldError {
  @ApiProperty({ example: "email", type: String })
  field!: string;

  @ApiProperty({ example: "email must be an email", type: String })
  message!: string;
}

export class ApiErrorResponseDto implements ApiErrorResponse {
  @ApiProperty({ example: 400, type: Number })
  statusCode!: number;

  @ApiProperty({ example: "VALIDATION_ERROR", type: String })
  code!: string;

  @ApiProperty({ example: "Request validation failed", type: String })
  message!: string;

  @ApiProperty({ type: [ApiFieldErrorDto] })
  fieldErrors!: ApiFieldErrorDto[];

  @ApiProperty({ example: "2c252c56-8b2a-4f1c-aea4-ae92791ec455", type: String })
  requestId!: string;

  @ApiProperty({ example: "2026-06-21T12:00:00.000Z", type: String })
  timestamp!: string;

  @ApiProperty({ example: "/api/v1/example", type: String })
  path!: string;
}
