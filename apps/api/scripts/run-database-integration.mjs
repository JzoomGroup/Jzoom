/* global console, process, URL */

import { spawn } from "node:child_process";
import { resolve } from "node:path";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
  console.error(
    "TEST_DATABASE_URL is required. Integration tests never use DATABASE_URL implicitly.",
  );
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(databaseUrl);
} catch {
  console.error("TEST_DATABASE_URL is not a valid PostgreSQL URL.");
  process.exit(1);
}

const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
if (!/test|ci/i.test(databaseName)) {
  console.error(
    `Refusing database integration tests: database name "${databaseName}" must contain "test" or "ci".`,
  );
  process.exit(1);
}

console.log(`Running database integration tests on ${parsed.hostname}/${databaseName}.`);
const jest = resolve(import.meta.dirname, "../../../node_modules/jest/bin/jest.js");
const child = spawn(
  process.execPath,
  [
    "--experimental-vm-modules",
    jest,
    "--config",
    "jest.config.cjs",
    "--runInBand",
    "--testTimeout",
    "30000",
    "--testPathPattern",
    "\\.integration\\.spec\\.ts$",
  ],
  {
    cwd: resolve(import.meta.dirname, ".."),
    env: {
      ...process.env,
      DATABASE_INTEGRATION: "true",
      DATABASE_URL: databaseUrl,
      NODE_ENV: "test",
    },
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Integration tests were terminated by ${signal}.`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
