import { getDb } from "@/db";
import { clients } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { id, revision, text, InputError } from "@/lib/operations";
import { conflict, readInput, routeError } from "../_shared";

async function save(request: Request, editing: boolean) {
  try {
    const input = await readInput(request), recordId = id(input.id), db = getDb();
    const email = text(input.email, "Email", 160);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InputError("Enter a valid email address.");
    const values = {
      firstName: text(input.firstName, "First name", 100, true), lastName: text(input.lastName, "Last name", 100, true),
      organization: text(input.organization, "Organization", 160), email, phone: text(input.phone, "Phone", 80),
      address: text(input.address, "Address", 240), city: text(input.city, "City", 120),
      state: text(input.state, "State", 2).toUpperCase(), postalCode: text(input.postalCode, "ZIP", 20), notes: text(input.notes, "Notes"),
    };
    if (!editing) {
      const existing = await db.select().from(clients).where(eq(clients.id, recordId)).get();
      if (existing) return Response.json({ client: existing });
      const [client] = await db.insert(clients).values({ id: recordId, ...values }).returning();
      return Response.json({ client }, { status: 201 });
    }
    const [client] = await db.update(clients).set({ ...values, revision: sql`${clients.revision} + 1`, updatedAt: sql`CURRENT_TIMESTAMP` }).where(and(eq(clients.id, recordId), eq(clients.revision, revision(input.revision)))).returning();
    if (!client) conflict();
    return Response.json({ client });
  } catch (error) { return routeError(error); }
}
export const POST = (request: Request) => save(request, false);
export const PATCH = (request: Request) => save(request, true);
