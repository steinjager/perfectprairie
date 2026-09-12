import { getD1 } from "@/db";
import { calculateItems, choice, date, estimateStatuses, id, invoiceStatuses, revision, text, InputError, validateMap, customerMap } from "@/lib/operations";
import { conflict, nextDocumentNumber, readInput, routeError } from "../_shared";

async function save(request: Request, editing: boolean) {
  try {
    const input = await readInput(request), recordId = id(input.id), db = getD1();
    const kind = choice(input.kind, ["estimate", "invoice"], "document type");
    const table = kind === "invoice" ? "invoices" : "estimates";
    const itemTable = kind === "invoice" ? "invoice_items" : "estimate_items";
    const foreignKey = kind === "invoice" ? "invoice_id" : "estimate_id";
    const dueColumn = kind === "invoice" ? "due_date" : "valid_until";
    const projectId = id(input.projectId);
    const { items, totalCents, markupBps } = calculateItems(input.items, input.markupPercent);
    const status = choice(input.status, kind === "invoice" ? invoiceStatuses : estimateStatuses, "document status");
    const issueDate = date(input.issueDate, "Issue date", true), due = date(input.dueDate, "Due / expiry date");
    if (due && issueDate && due < issueDate) throw new InputError("Due / expiry date cannot be before the issue date.");
    const notes = text(input.notes, "Customer notes");
    const paidAt = kind === "invoice" && status === "paid" ? date(input.paidAt, "Paid date", true) : null;
    const existing = await db.prepare(`SELECT id, revision FROM ${table} WHERE id = ?`).bind(recordId).first<{ id: string; revision: number }>();
    if (!editing && existing) return Response.json({ id: recordId });
    const expected = editing ? revision(input.revision) : 0;
    if (editing && (!existing || existing.revision !== expected)) conflict();
    let planJson: string | null = null;
    if (kind === "estimate") {
      const action = choice(input.planAction ?? (editing ? "keep" : "attach"),["keep","attach","remove"],"plan attachment");
      if (action === "keep" && editing) {
        const previous = await db.prepare("SELECT plan_json, project_id FROM estimates WHERE id = ?").bind(recordId).first<{plan_json:string|null;project_id:string}>();
        if (previous?.project_id === projectId) planJson = previous.plan_json;
      } else if (action === "attach") {
        const project = await db.prepare("SELECT map_json FROM projects WHERE id = ?").bind(projectId).first<{map_json:string|null}>();
        const map = project?.map_json ? customerMap(validateMap(JSON.parse(project.map_json))) : null;
        planJson = map ? JSON.stringify(map) : null;
      }
    }
    const batch: D1PreparedStatement[] = [];
    if (editing) {
      batch.push(db.prepare(`DELETE FROM ${itemTable} WHERE ${foreignKey} = ? AND EXISTS (SELECT 1 FROM ${table} WHERE id = ? AND revision = ?)`).bind(recordId, recordId, expected));
    } else {
      const number = await nextDocumentNumber(kind as "estimate" | "invoice");
      batch.push(db.prepare(`INSERT INTO ${table} (id, project_id, number, status, issue_date, ${dueColumn}, notes, markup_bps, subtotal_cents, total_cents${kind === "invoice" ? ", paid_at" : ""}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?${kind === "invoice" ? ", ?" : ""})`)
        .bind(recordId, projectId, number, status, issueDate, due, notes, markupBps, totalCents, totalCents, ...(kind === "invoice" ? [paidAt] : [])));
    }
    for (const [position, item] of items.entries()) {
      batch.push(db.prepare(`INSERT INTO ${itemTable} (id, ${foreignKey}, description, quantity_milli, unit_cost_cents, unit_price_cents, position) SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM ${table} WHERE id = ? AND revision = ?)`)
        .bind(crypto.randomUUID(), recordId, item.description, item.quantityMilli, item.unitCostCents, item.unitPriceCents, position, recordId, expected));
    }
    if (kind === "estimate") batch.push(db.prepare("UPDATE estimates SET plan_json = ? WHERE id = ? AND revision = ?").bind(planJson,recordId,expected));
    if (editing) {
      batch.push(db.prepare(`UPDATE ${table} SET project_id = ?, status = ?, issue_date = ?, ${dueColumn} = ?, notes = ?, markup_bps = ?, subtotal_cents = ?, total_cents = ?, revision = revision + 1, updated_at = CURRENT_TIMESTAMP${kind === "invoice" ? ", paid_at = ?" : ""} WHERE id = ? AND revision = ?`)
        .bind(projectId, status, issueDate, due, notes, markupBps, totalCents, totalCents, ...(kind === "invoice" ? [paidAt] : []), recordId, expected));
    }
    const results = await db.batch(batch);
    if (editing && results.at(-1)?.meta.changes !== 1) conflict();
    return Response.json({ id: recordId }, { status: editing ? 200 : 201 });
  } catch (error) { return routeError(error); }
}
export const POST = (request: Request) => save(request, false);
export const PATCH = (request: Request) => save(request, true);
