import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

process.env.HOSTNAME ??= "0.0.0.0";
process.env.PORT ??= "3000";

await import(pathToFileURL(resolve(".next/standalone/apps/web/server.js")));
