import assert from "node:assert/strict";
import test from "node:test";
import {
  EnvironmentValidationError,
  parseApiEnvironment,
  parseWebEnvironment,
  parseWorkerEnvironment,
} from "../dist/index.js";

test("API environment applies safe non-production defaults", () => {
  const environment = parseApiEnvironment({
    DATABASE_URL: "postgresql://user:password@localhost:5432/jzoom",
    NODE_ENV: "development",
  });

  assert.equal(environment.port, 4000);
  assert.equal(environment.openApiEnabled, true);
  assert.equal(environment.auth.cookieName, "jzoom_session");
  assert.equal(environment.auth.cookieDomain, undefined);
  assert.equal(environment.auth.cookieSecure, false);
  assert.equal(environment.auth.defaultTemporaryPassword, undefined);
});

test("API environment accepts an explicit temporary password with the eight-character policy", () => {
  const environment = parseApiEnvironment({
    DATABASE_URL: "postgresql://user:password@localhost:5432/jzoom",
    AUTH_DEFAULT_TEMPORARY_PASSWORD: "Secure#8",
  });

  assert.equal(environment.auth.defaultTemporaryPassword, "Secure#8");
});

test("Swagger UI is disabled by default in production", () => {
  const environment = parseApiEnvironment({
    DATABASE_URL: "postgresql://user:password@localhost:5432/jzoom",
    NODE_ENV: "production",
  });

  assert.equal(environment.openApiEnabled, false);
  assert.equal(environment.auth.cookieSecure, true);
});

test("API environment supports shared auth cookies across subdomains", () => {
  const environment = parseApiEnvironment({
    DATABASE_URL: "postgresql://user:password@localhost:5432/jzoom",
    NODE_ENV: "production",
    AUTH_COOKIE_DOMAIN: ".jzoom.sa",
  });

  assert.equal(environment.auth.cookieDomain, ".jzoom.sa");
});

test("bootstrap Admin credentials must be explicitly paired", () => {
  assert.throws(
    () =>
      parseApiEnvironment({
        DATABASE_URL: "postgresql://user:password@localhost:5432/jzoom",
        BOOTSTRAP_ADMIN_EMAIL: "admin@example.com",
      }),
    EnvironmentValidationError,
  );
});

test("test auth tokens cannot be exposed in production", () => {
  assert.throws(
    () =>
      parseApiEnvironment({
        DATABASE_URL: "postgresql://user:password@localhost:5432/jzoom",
        NODE_ENV: "production",
        AUTH_EXPOSE_TEST_TOKENS: "true",
      }),
    EnvironmentValidationError,
  );
});

test("invalid environment configuration fails clearly", () => {
  assert.throws(
    () =>
      parseApiEnvironment({
        DATABASE_URL: "sqlite://local.db",
        NODE_ENV: "production",
      }),
    EnvironmentValidationError,
  );
});

test("worker environment validates database and outbox defaults", () => {
  const environment = parseWorkerEnvironment({
    DATABASE_URL: "postgresql://jzoom:secret@localhost:5432/jzoom",
    NODE_ENV: "test",
  });

  assert.deepEqual(environment, {
    nodeEnvironment: "test",
    databaseUrl: "postgresql://jzoom:secret@localhost:5432/jzoom",
    workerName: "jzoom-worker",
    outboxEnabled: true,
    outboxPollIntervalMs: 5_000,
    outboxBatchSize: 20,
    outboxMaxAttempts: 10,
    outboxLeaseMs: 30_000,
  });
});

test("web environment documents API and CSRF cookie defaults", () => {
  const environment = parseWebEnvironment({
    NODE_ENV: "development",
  });

  assert.deepEqual(environment, {
    nodeEnvironment: "development",
    apiBaseUrl: "http://localhost:4000/api/v1",
    cookieName: "jzoom_session",
    csrfCookieName: "jzoom_csrf",
  });
});
