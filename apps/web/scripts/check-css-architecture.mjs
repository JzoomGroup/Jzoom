import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const appRoot = join(webRoot, "src", "app");
const stylesRoot = join(appRoot, "styles");
const layout = readFileSync(join(appRoot, "layout.tsx"), "utf8");

const expectedOrder = [
  "globals-foundation.css",
  "design-foundation.css",
  "application-shell.css",
  "request-intake.css",
  "access-management.css",
  "catalog-management.css",
  "operations.css",
  "responsive.css",
  "compatibility.css",
  "premium-refinement.css",
  "system-shell.css",
  "system-components.css",
  "system-forms.css",
  "system-workflows.css",
  "system-responsive.css",
];

const failures = [];
let previousImportIndex = -1;

for (const file of expectedOrder) {
  const importStatement = `import "./styles/${file}";`;
  const importIndex = layout.indexOf(importStatement);
  if (importIndex < 0) {
    failures.push(`Missing layout import: ${file}`);
  } else if (importIndex <= previousImportIndex) {
    failures.push(`CSS import order changed around: ${file}`);
  }
  previousImportIndex = importIndex;
}

for (const forbidden of ["globals.css", "product-polish.css"]) {
  if (existsSync(join(appRoot, forbidden))) {
    failures.push(`Deprecated monolithic stylesheet exists: ${forbidden}`);
  }
}

const cssFiles = readdirSync(stylesRoot).filter((file) => file.endsWith(".css"));
for (const file of cssFiles) {
  const source = readFileSync(join(stylesRoot, file), "utf8");
  const lineCount = source.split(/\r?\n/).length;
  if (lineCount > 2500) {
    failures.push(`${file} exceeds the 2500-line ownership limit (${lineCount})`);
  }
  if (source.includes('url("./fonts/')) {
    failures.push(`${file} contains a broken font path after stylesheet modularization`);
  }
}

const unexpectedFiles = cssFiles.filter((file) => !expectedOrder.includes(file));
if (unexpectedFiles.length > 0) {
  failures.push(`Unregistered stylesheets: ${unexpectedFiles.join(", ")}`);
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`CSS architecture valid: ${cssFiles.length} ordered modules.`);
