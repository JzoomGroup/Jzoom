import { access } from "node:fs/promises";
import path from "node:path";

export async function findWorkspaceRoot(startDirectory: string): Promise<string> {
  let current = path.resolve(startDirectory);

  while (true) {
    try {
      await access(path.join(current, "pnpm-workspace.yaml"));
      return current;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) {
        throw new Error("Unable to locate the Jzoom workspace root.");
      }
      current = parent;
    }
  }
}
