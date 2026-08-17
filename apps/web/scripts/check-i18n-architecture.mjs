import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourceRoot = resolve(root, "src");
const i18nRoot = resolve(sourceRoot, "i18n");
const errors = [];

function filesUnder(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    if (statSync(path).isDirectory()) return filesUnder(path);
    return /\.(ts|tsx)$/.test(path) ? [path] : [];
  });
}

for (const path of filesUnder(sourceRoot)) {
  const content = readFileSync(path, "utf8");
  const location = relative(root, path).replaceAll("\\", "/");
  if (!path.startsWith(i18nRoot)) {
    const localDictionary = /^(?:export\s+)?const\s+(?:copy|[A-Za-z][A-Za-z0-9]*Copy)\s*=\s*\{/m;
    if (localDictionary.test(content)) {
      errors.push(`${location}: move static interface copy to src/i18n.`);
    }
  } else if (content.split(/\r?\n/).length > 1_500) {
    errors.push(`${location}: dictionary exceeds the 1,500-line maintainability limit.`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("i18n architecture valid: component dictionaries are centralized.");
}
