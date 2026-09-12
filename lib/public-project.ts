import { getDb } from "@/db";
import { estimates, estimateItems, invoices, invoiceItems, projects } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { parseMap } from "./admin-types";
import type { CustomerDocumentData } from "@/app/components/CustomerDocument";
import { customerMap } from "./operations";

export async function customerProject(token: string) {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const db=getDb();
  const project=await db.select({id:projects.id,name:projects.name,publicSummary:projects.publicSummary,mapJson:projects.mapJson}).from(projects).where(eq(projects.shareToken,token)).get();
  if(!project)return null;
  const fields={id:estimates.id,number:estimates.number,status:estimates.status,issueDate:estimates.issueDate,dueDate:estimates.validUntil,notes:estimates.notes,totalCents:estimates.totalCents,planJson:estimates.planJson};
  const estimateRows=await db.select(fields).from(estimates).where(and(eq(estimates.projectId,project.id),inArray(estimates.status,["sent","accepted","declined"])));
  const invoiceRows=await db.select({id:invoices.id,number:invoices.number,status:invoices.status,issueDate:invoices.issueDate,dueDate:invoices.dueDate,notes:invoices.notes,totalCents:invoices.totalCents}).from(invoices).where(and(eq(invoices.projectId,project.id),inArray(invoices.status,["sent","paid"])));
  const documents: CustomerDocumentData[]=[];
  for(const record of estimateRows){
    const items=await db.select({description:estimateItems.description,quantityMilli:estimateItems.quantityMilli,unitPriceCents:estimateItems.unitPriceCents}).from(estimateItems).where(eq(estimateItems.estimateId,record.id)).orderBy(estimateItems.position);
    documents.push({...record,kind:"estimate",items});
  }
  for(const record of invoiceRows){
    const items=await db.select({description:invoiceItems.description,quantityMilli:invoiceItems.quantityMilli,unitPriceCents:invoiceItems.unitPriceCents}).from(invoiceItems).where(eq(invoiceItems.invoiceId,record.id)).orderBy(invoiceItems.position);
    documents.push({...record,kind:"invoice",items});
  }
  return {name:project.name,summary:project.publicSummary,map:customerMap(parseMap(project)),documents};
}
