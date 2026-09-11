import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, estimateItems, estimates, invoiceItems, invoices, projects, projectItems } from "@/db/schema";
import { routeError } from "../_shared";

export async function GET() {
  try {
    const db = getDb();
    const [clientRows, projectRows, estimateRows, invoiceRows, estimateItemRows, invoiceItemRows, projectItemRows] = await Promise.all([
      db.select().from(clients).orderBy(desc(clients.createdAt)),
      db.select().from(projects).orderBy(desc(projects.updatedAt)),
      db.select().from(estimates).orderBy(desc(estimates.createdAt)),
      db.select().from(invoices).orderBy(desc(invoices.createdAt)),
      db.select().from(estimateItems).orderBy(estimateItems.position),
      db.select().from(invoiceItems).orderBy(invoiceItems.position),
      db.select().from(projectItems).orderBy(projectItems.createdAt, projectItems.id),
    ]);

    return Response.json({
      clients: clientRows,
      projects: projectRows,
      projectItems: projectItemRows,
      estimates: estimateRows.map((record) => ({ ...record, items: estimateItemRows.filter((item) => item.estimateId === record.id) })),
      invoices: invoiceRows.map((record) => ({ ...record, items: invoiceItemRows.filter((item) => item.invoiceId === record.id) })),
    });
  } catch (error) {
    return routeError(error);
  }
}
