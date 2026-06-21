import assert from "node:assert/strict";
import test from "node:test";
import {
  EnvironmentValidationError,
  parseApiEnvironment,
  parseWorkerEnvironment,
} from "../dist/index.js";

test("API environment applies safe non-production defaults", () => {
  const environment = parseApiEnvironment({
    DATABASE_URL: "postgresql://user:password@localhost:5432/jzoom",
    NODE_ENV: "development",
  });

  assert.equal(environment.port, 4000);
  assert.equal(environment.openApiEnabled, true);
});

test("Swagger UI is disabled by default in production", () => {
  const environment = parseApiEnvironment({
    DATABASE_URL: "postgresql://user:password@localhost:5432/jzoom",
    NODE_ENV: "production",
  });

  assert.equal(environment.openApiEnabled, false);
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
