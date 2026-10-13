import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");
const isFile = (f) => existsSync(f) && statSync(f).isFile();

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = path.join(SRC, specifier.slice(2));
    const file = [base, `${base}.js`, `${base}.mjs`].find(isFile);
    if (file) return next(pathToFileURL(file).href, context);
  }
  return next(specifier, context);
}
