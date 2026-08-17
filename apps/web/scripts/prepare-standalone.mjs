import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneRoot = join(appRoot, ".next", "standalone", "apps", "web");

if (!existsSync(join(standaloneRoot, "server.js"))) {
  throw new Error("Next.js standalone server was not generated");
}

function copyRuntimeAsset(source, destination) {
  if (!existsSync(source)) {
    return;
  }

  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true, force: true });
}

copyRuntimeAsset(join(appRoot, "public"), join(standaloneRoot, "public"));
copyRuntimeAsset(join(appRoot, ".next", "static"), join(standaloneRoot, ".next", "static"));

console.log("Standalone runtime assets prepared.");
