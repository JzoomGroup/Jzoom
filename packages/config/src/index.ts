import { z } from "zod";

const nodeEnvironmentSchema = z.enum(["development", "test", "production"]);

const databaseUrlSchema = z
  .string()
  .min(1, "DATABASE_URL is required")
  .refine(
    (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
    "DATABASE_URL must be a PostgreSQL connection string",
  );

const optionalBooleanSchema = z
  .enum(["true", "false", "1", "0"])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    return value === "true" || value === "1";
  });

const apiEnvironmentSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema.default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  DATABASE_URL: databaseUrlSchema,
  OPENAPI_ENABLED: optionalBooleanSchema,
});

const workerEnvironmentSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema.default("development"),
  WORKER_NAME: z.string().trim().min(1).default("jzoom-worker"),
});

const webEnvironmentSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema.default("development"),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:4000/api/v1"),
});

export interface ApiEnvironment {
  nodeEnvironment: z.infer<typeof nodeEnvironmentSchema>;
  port: number;
  databaseUrl: string;
  openApiEnabled: boolean;
}

export interface WorkerEnvironment {
  nodeEnvironment: z.infer<typeof nodeEnvironmentSchema>;
  workerName: string;
}

export interface WebEnvironment {
  nodeEnvironment: z.infer<typeof nodeEnvironmentSchema>;
  apiBaseUrl: string;
}

export class EnvironmentValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid environment configuration:\n- ${issues.join("\n- ")}`);
    this.name = "EnvironmentValidationError";
  }
}

function parseWithSchema<T>(schema: z.ZodType<T>, input: NodeJS.ProcessEnv): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new EnvironmentValidationError(
      result.error.issues.map(
        (issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`,
      ),
    );
  }

  return result.data;
}

export function parseApiEnvironment(input: NodeJS.ProcessEnv): ApiEnvironment {
  const environment = parseWithSchema(apiEnvironmentSchema, input);

  return {
    nodeEnvironment: environment.NODE_ENV,
    port: environment.API_PORT,
    databaseUrl: environment.DATABASE_URL,
    openApiEnabled: environment.OPENAPI_ENABLED ?? environment.NODE_ENV !== ("production" as const),
  };
}

export function parseWorkerEnvironment(input: NodeJS.ProcessEnv): WorkerEnvironment {
  const environment = parseWithSchema(workerEnvironmentSchema, input);

  return {
    nodeEnvironment: environment.NODE_ENV,
    workerName: environment.WORKER_NAME,
  };
}

export function parseWebEnvironment(input: NodeJS.ProcessEnv): WebEnvironment {
  const environment = parseWithSchema(webEnvironmentSchema, input);

  return {
    nodeEnvironment: environment.NODE_ENV,
    apiBaseUrl: environment.NEXT_PUBLIC_API_BASE_URL,
  };
}
