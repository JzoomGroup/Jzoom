import { randomUUID } from "node:crypto";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidRequestId(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function resolveRequestId(value: unknown): string {
  return isValidRequestId(value) ? value : randomUUID();
}
