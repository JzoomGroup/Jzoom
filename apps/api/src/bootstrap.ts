import type { INestApplication } from "@nestjs/common";
import { BadRequestException, ConsoleLogger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { ApiEnvironment } from "@jzoom/config";
import type { ApiFieldError } from "@jzoom/contracts";
import { AppModule } from "./app.module.js";
import { GlobalExceptionFilter } from "./errors/global-exception.filter.js";
import { RequestContextService } from "./request-context/request-context.service.js";
import { RequestIdMiddleware } from "./request-context/request-id.middleware.js";
import { RequestLoggingInterceptor } from "./request-context/request-logging.interceptor.js";
import { setupOpenApiUi } from "./swagger/openapi.js";

export interface CreateApiApplicationOptions {
  enableOpenApiUi?: boolean;
}

export function configureApiApplication(
  app: INestApplication,
  environment: ApiEnvironment,
  options: CreateApiApplicationOptions = {},
): void {
  const requestIdMiddleware = new RequestIdMiddleware(app.get(RequestContextService));

  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));
  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: environment.webOrigin,
    credentials: true,
    allowedHeaders: ["Content-Type", "X-CSRF-Token", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
  });
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (validationErrors) => {
        const fieldErrors: ApiFieldError[] = validationErrors.flatMap((validationError) =>
          Object.values(validationError.constraints ?? {}).map((message) => ({
            field: validationError.property,
            message,
          })),
        );

        return new BadRequestException({
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          fieldErrors,
        });
      },
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  if (
    options.enableOpenApiUi !== false &&
    environment.openApiEnabled &&
    environment.nodeEnvironment !== "production"
  ) {
    setupOpenApiUi(app);
  }
}

export async function createApiApplication(
  environment: ApiEnvironment,
  options: CreateApiApplicationOptions = {},
): Promise<INestApplication> {
  const logger = new ConsoleLogger("JzoomApi", {
    json: true,
    timestamp: true,
  });
  const app = await NestFactory.create(AppModule.forRoot(environment), {
    logger,
  });

  configureApiApplication(app, environment, options);

  return app;
}
