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
  assert.equal(environment.auth.cookieSecure, false);
});

test("Swagger UI is disabled by default in production", () => {
  const environment = parseApiEnvironment({
    DATABASE_URL: "postgresql://user:password@localhost:5432/jzoom",
    NODE_ENV: "production",
  });

  assert.equal(environment.openApiEnabled, false);
  assert.equal(environment.auth.cookieSecure, true);
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

test("worker environment remains business-logic free", () => {
  const environment = parseWorkerEnvironment({
    NODE_ENV: "test",
  });

  assert.deepEqual(environment, {
    nodeEnvironment: "test",
    workerName: "jzoom-worker",
  });
});

test("web environment documents API and CSRF cookie defaults", () => {
  const environment = parseWebEnvironment({
    NODE_ENV: "development",
  });

  assert.deepEqual(environment, {
    nodeEnvironment: "development",
    apiBaseUrl: "http://localhost:4000/api/v1",
    csrfCookieName: "jzoom_csrf",
  });
});
