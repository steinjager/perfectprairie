import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { choice, id, projectStatuses, revision, services, text } from "@/lib/operations";
import { conflict, readInput, routeError } from "../_shared";

async function save(request: Request, editing: boolean) {
  try {
    const input = await readInput(request), recordId = id(input.id), db = getDb();
    const values = {
      clientId: id(input.clientId), name: text(input.name, "Project name", 180, true),
      serviceType: choice(input.serviceType, Object.keys(services), "service"), status: choice(input.status, projectStatuses, "status"),
      siteAddress: text(input.siteAddress, "Site address", 300), description: text(input.description, "Internal field notes"),
      publicSummary: text(input.publicSummary, "Customer summary", 4000),
    };
    if (!editing) {
      const existing = await db.select().from(projects).where(eq(projects.id, recordId)).get();
      if (existing) return Response.json({ project: existing });
      const [project] = await db.insert(projects).values({ id: recordId, ...values }).returning();
      return Response.json({ project }, { status: 201 });
    }
    const [project] = await db.update(projects).set({ ...values, revision: sql`${projects.revision} + 1`, updatedAt: sql`CURRENT_TIMESTAMP` }).where(and(eq(projects.id, recordId), eq(projects.revision, revision(input.revision)))).returning();
    if (!project) conflict();
    return Response.json({ project });
  } catch (error) { return routeError(error); }
}
export const POST = (request: Request) => save(request, false);
export const PATCH = (request: Request) => save(request, true);
