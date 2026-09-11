import { getDb, getProjectFiles } from "@/db";
import { projectItems, projects } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { id, InputError, revision } from "@/lib/operations";
import { validatePhoto, validateProjectItem } from "@/lib/project-items";
import { conflict, readInput, routeError } from "../_shared";

async function save(request: Request, editing: boolean) {
  try {
    const input = await readInput(request, 1_500_000), db = getDb();
    const recordId = id(input.id), projectId = id(input.projectId);
    const values = validateProjectItem(input);
    const existing = await db.select().from(projectItems).where(eq(projectItems.id, recordId)).get();
    if (!editing && existing) return Response.json({ item: existing });
    if (editing && (!existing || existing.projectId !== projectId || existing.revision !== revision(input.revision))) conflict();
    if (!await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get()) throw new InputError("Project not found.", 404);
    let imageKey = existing?.imageKey ?? null;
    if (input.removeImage === true) imageKey = null;
    if (input.imageData) {
      if (typeof input.imageData !== "string" || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(input.imageData)) throw new InputError("Upload a JPEG photo using the image picker.");
      const bytes = Uint8Array.from(atob(input.imageData.split(",")[1]), c => c.charCodeAt(0));
      validatePhoto(bytes);
      imageKey = `project-items/${projectId}/${recordId}/${crypto.randomUUID()}.jpg`;
      await getProjectFiles().put(imageKey, bytes, { httpMetadata: { contentType: "image/jpeg" } });
    }
    const [item] = editing
      ? await db.update(projectItems).set({ ...values, imageKey, revision: sql`${projectItems.revision} + 1`, updatedAt: sql`CURRENT_TIMESTAMP` }).where(and(eq(projectItems.id, recordId), eq(projectItems.revision, revision(input.revision)))).returning()
      : await db.insert(projectItems).values({ id: recordId, projectId, ...values, imageKey }).returning();
    if (!item) conflict();
    return Response.json({ item }, { status: editing ? 200 : 201 });
  } catch (error) { return routeError(error); }
}
export const POST = (request: Request) => save(request, false);
export const PATCH = (request: Request) => save(request, true);

export async function GET(request: Request) {
  try {
    const recordId = id(new URL(request.url).searchParams.get("image"));
    const item = await getDb().select().from(projectItems).where(eq(projectItems.id, recordId)).get();
    if (!item?.imageKey) return new Response("Not found", { status: 404 });
    const image = await getProjectFiles().get(item.imageKey);
    if (!image) return new Response("Not found", { status: 404 });
    return new Response(image.body, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
  } catch (error) { return routeError(error); }
}
