import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { AsyncLocalStorage } from "node:async_hooks";

const bindings = new AsyncLocalStorage<{ DB?: D1Database; CONTACT_WEBHOOK_URL?: string; GOOGLE_REVIEW_URL?: string }>();
export function withBindings<T>(env: { DB?: D1Database; CONTACT_WEBHOOK_URL?: string; GOOGLE_REVIEW_URL?: string }, callback: () => T) { return bindings.run(env, callback); }
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
