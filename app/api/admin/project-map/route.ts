import { getDb } from "@/db";
import { projects, projectItems } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { id, revision, validateMap, InputError } from "@/lib/operations";
import { conflict, readInput, routeError } from "../_shared";

export async function PATCH(request: Request) {
  try {
    const input = await readInput(request);
    const values: Partial<typeof projects.$inferInsert> = { revision: revision(input.revision) + 1 };
    if (Object.hasOwn(input, "map")) {
      const map = validateMap(input.map);
      const items = await getDb().select({ id: projectItems.id }).from(projectItems).where(eq(projectItems.projectId, id(input.id)));
      const ids = new Set(items.map(i => i.id));
      if (map?.features.some(f => f.projectItemId && !ids.has(f.projectItemId))) throw new InputError("A map item must belong to this project.");
      values.mapJson = JSON.stringify(map);
    }
    if (Object.hasOwn(input, "sharing")) {
      if (typeof input.sharing !== "boolean") throw new InputError("Invalid sharing setting.");
      values.shareToken = input.sharing ? Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, "0")).join("") : null;
    }
    const [project] = await getDb().update(projects).set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` }).where(and(eq(projects.id, id(input.id)), eq(projects.revision, revision(input.revision)))).returning();
    if (!project) conflict();
    return Response.json({ project });
  } catch (error) { return routeError(error); }
}
