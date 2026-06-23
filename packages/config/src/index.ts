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

const apiEnvironmentSchema = z
  .object({
    NODE_ENV: nodeEnvironmentSchema.default("development"),
    API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    DATABASE_URL: databaseUrlSchema,
    OPENAPI_ENABLED: optionalBooleanSchema,
    WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
    AUTH_SESSION_TTL_MINUTES: z.coerce.number().int().min(5).max(43_200).default(480),
    AUTH_COOKIE_NAME: z.string().trim().min(1).default("jzoom_session"),
    AUTH_CSRF_COOKIE_NAME: z.string().trim().min(1).default("jzoom_csrf"),
    AUTH_COOKIE_SECURE: optionalBooleanSchema,
    AUTH_EXPOSE_TEST_TOKENS: optionalBooleanSchema,
    AUTH_MAX_LOGIN_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
    AUTH_LOCKOUT_MINUTES: z.coerce.number().int().min(1).max(1_440).default(15),
    BOOTSTRAP_ADMIN_EMAIL: z.string().trim().email().optional(),
    BOOTSTRAP_ADMIN_PASSWORD: z.string().min(12).optional(),
  })
  .superRefine((environment, context) => {
    const hasEmail = environment.BOOTSTRAP_ADMIN_EMAIL !== undefined;
    const hasPassword = environment.BOOTSTRAP_ADMIN_PASSWORD !== undefined;

    if (hasEmail !== hasPassword) {
      context.addIssue({
        code: "custom",
        message: "BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD must be provided together",
        path: ["BOOTSTRAP_ADMIN_EMAIL"],
      });
    }

    if (environment.NODE_ENV === "production" && environment.AUTH_EXPOSE_TEST_TOKENS === true) {
      context.addIssue({
        code: "custom",
        message: "AUTH_EXPOSE_TEST_TOKENS cannot be enabled in production",
        path: ["AUTH_EXPOSE_TEST_TOKENS"],
      });
    }
  });

const workerEnvironmentSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema.default("development"),
  WORKER_NAME: z.string().trim().min(1).default("jzoom-worker"),
});

const webEnvironmentSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema.default("development"),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:4000/api/v1"),
  NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME: z.string().trim().min(1).default("jzoom_csrf"),
});

export interface ApiEnvironment {
  nodeEnvironment: z.infer<typeof nodeEnvironmentSchema>;
  port: number;
  databaseUrl: string;
  openApiEnabled: boolean;
  webOrigin: string;
  auth: {
    sessionTtlMinutes: number;
    cookieName: string;
    csrfCookieName: string;
    cookieSecure: boolean;
    exposeTestTokens: boolean;
    maxLoginAttempts: number;
    lockoutMinutes: number;
  };
  bootstrapAdmin?: {
    email: string;
    password: string;
  };
}

export interface WorkerEnvironment {
  nodeEnvironment: z.infer<typeof nodeEnvironmentSchema>;
  workerName: string;
}

export interface WebEnvironment {
  nodeEnvironment: z.infer<typeof nodeEnvironmentSchema>;
  apiBaseUrl: string;
  csrfCookieName: string;
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
  const bootstrapAdmin =
    environment.BOOTSTRAP_ADMIN_EMAIL && environment.BOOTSTRAP_ADMIN_PASSWORD
      ? {
          email: environment.BOOTSTRAP_ADMIN_EMAIL.toLowerCase(),
          password: environment.BOOTSTRAP_ADMIN_PASSWORD,
        }
      : undefined;

  return {
    nodeEnvironment: environment.NODE_ENV,
    port: environment.API_PORT,
    databaseUrl: environment.DATABASE_URL,
    openApiEnabled: environment.OPENAPI_ENABLED ?? environment.NODE_ENV !== ("production" as const),
    webOrigin: environment.WEB_ORIGIN,
    auth: {
      sessionTtlMinutes: environment.AUTH_SESSION_TTL_MINUTES,
      cookieName: environment.AUTH_COOKIE_NAME,
      csrfCookieName: environment.AUTH_CSRF_COOKIE_NAME,
      cookieSecure:
        environment.AUTH_COOKIE_SECURE ?? environment.NODE_ENV === ("production" as const),
      exposeTestTokens: environment.AUTH_EXPOSE_TEST_TOKENS ?? false,
      maxLoginAttempts: environment.AUTH_MAX_LOGIN_ATTEMPTS,
      lockoutMinutes: environment.AUTH_LOCKOUT_MINUTES,
    },
    ...(bootstrapAdmin ? { bootstrapAdmin } : {}),
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
    csrfCookieName: environment.NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME,
  };
}
