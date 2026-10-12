// Lets plain `node --test` resolve the app's "@/..." alias (-> src/...) so the
// pure-logic modules can be tested without Metro or Jest.
import { register } from "node:module";
register("./alias-loader.mjs", import.meta.url);
