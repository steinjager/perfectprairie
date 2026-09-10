import { getD1 } from "@/db";
import { InputError } from "@/lib/operations";

export async function readInput(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("A JSON request is required.");
  let length = 0; const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 300_000) { await reader.cancel(); throw new InputError("This request is too large.", 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const result = JSON.parse(new TextDecoder().decode(bytes));
    if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error();
    return result;
  } catch { throw new InputError("Invalid JSON request."); }
}

export function conflict() { throw new InputError("This record changed in another session. Close and reopen it to load the latest version before saving.", 409); }

export const serviceTypes = ["consultation", "native-landscape", "prairie-wildflower"] as const;
export const projectStatuses = ["lead", "scheduled", "in-progress", "complete", "on-hold"] as const;

export function clean(value: unknown, max = 2_000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function allowed<T extends readonly string[]>(value: unknown, values: T, fallback: T[number]) {
  return typeof value === "string" && values.includes(value as T[number]) ? value as T[number] : fallback;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function cents(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100);
}

export async function nextDocumentNumber(kind: "estimate" | "invoice") {
  const year = new Date().getUTCFullYear();
  const row = await getD1().prepare(`
    INSERT INTO document_counters (kind, year, value)
    VALUES (?, ?, 1)
    ON CONFLICT(kind, year) DO UPDATE SET value = value + 1
    RETURNING value
  `).bind(kind, year).first<{ value: number }>();
  if (!row) throw new Error("Could not reserve a document number");
  return `PP-${kind === "estimate" ? "E" : "I"}-${year}-${String(row.value).padStart(4, "0")}`;
}

export function routeError(error: unknown) {
  if (error instanceof InputError) return Response.json({ error: error.message }, { status: error.status });
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("no such table")) return Response.json({ error: "The admin database has not been initialized." }, { status: 503 });
  if (message.includes("FOREIGN KEY")) return Response.json({ error: "Please choose a valid linked record." }, { status: 400 });
  console.error(JSON.stringify({ event: "admin_route_error", message }));
  return Response.json({ error: "The request could not be completed." }, { status: 500 });
}
