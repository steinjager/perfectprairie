import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { AsyncLocalStorage } from "node:async_hooks";

type Bindings = Partial<Pick<Cloudflare.Env, "DB" | "PROJECT_FILES" | "GOOGLE_REVIEW_URL">> & { CONTACT_WEBHOOK_URL?: string };
const bindings = new AsyncLocalStorage<Bindings>();
export function withBindings<T>(env: Bindings, callback: () => T) { return bindings.run(env, callback); }
export function getProjectFiles() {
  const bucket = bindings.getStore()?.PROJECT_FILES;
  if (!bucket) throw new Error("Project photo storage is unavailable.");
  return bucket;
}
export function runtimeSetting(name: "CONTACT_WEBHOOK_URL" | "GOOGLE_REVIEW_URL") { return bindings.getStore()?.[name] ?? process.env[name]; }

export function getDb() {
  const runtimeDb = bindings.getStore()?.DB;
  if (!runtimeDb) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Check the database binding in wrangler.jsonc."
    );
  }

  return drizzle(runtimeDb, { schema });
}

export function getD1() {
  const runtimeDb = bindings.getStore()?.DB;
  if (!runtimeDb) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  return runtimeDb;
}
