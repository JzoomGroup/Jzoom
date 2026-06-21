import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import { DatabaseService } from "../database/database.service.js";
import { ApiErrorResponseDto } from "../errors/api-error-response.dto.js";
import { LivenessResponseDto, ReadinessResponseDto } from "./health.dto.js";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  @Get("live")
  @ApiOperation({ summary: "Report whether the API process is alive" })
  @ApiOkResponse({ type: LivenessResponseDto })
  getLiveness(): LivenessResponseDto {
    return {
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime() * 100) / 100,
    };
  }

  @Get("ready")
  @ApiOperation({ summary: "Report whether required API dependencies are ready" })
  @ApiOkResponse({ type: ReadinessResponseDto })
  @ApiServiceUnavailableResponse({ type: ApiErrorResponseDto })
  async getReadiness(): Promise<ReadinessResponseDto> {
    try {
      await this.database.ping();
    } catch {
      throw new ServiceUnavailableException({
        code: "DATABASE_UNAVAILABLE",
        message: "Database readiness check failed",
      });
    }

    return {
      status: "ready",
      service: "api",
      database: "up",
      timestamp: new Date().toISOString(),
    };
  }
}
