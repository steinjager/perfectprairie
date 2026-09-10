import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { id, revision, validateMap, InputError } from "@/lib/operations";
import { conflict, readInput, routeError } from "../_shared";

export async function PATCH(request: Request) {
  try {
    const input = await readInput(request);
    const values: Partial<typeof projects.$inferInsert> = { revision: revision(input.revision) + 1 };
    if (Object.hasOwn(input, "map")) values.mapJson = JSON.stringify(validateMap(input.map));
    if (Object.hasOwn(input, "sharing")) {
      if (typeof input.sharing !== "boolean") throw new InputError("Invalid sharing setting.");
      values.shareToken = input.sharing ? Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, "0")).join("") : null;
    }
    const [project] = await getDb().update(projects).set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` }).where(and(eq(projects.id, id(input.id)), eq(projects.revision, revision(input.revision)))).returning();
    if (!project) conflict();
    return Response.json({ project });
  } catch (error) { return routeError(error); }
}
