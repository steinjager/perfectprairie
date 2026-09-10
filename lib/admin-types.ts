import type { ProjectMap } from "./operations";
export type Client = { id: string; revision: number; firstName: string; lastName: string; organization: string; email: string; phone: string; address: string; city: string; state: string; postalCode: string; notes: string };
export type Project = { id: string; revision: number; clientId: string; name: string; serviceType: string; status: string; siteAddress: string; description: string; publicSummary: string; targetStartDate: string | null; mapJson: string | null; shareToken: string | null };
export type LineItem = { id: string; description: string; quantityMilli: number; unitCostCents: number | null; unitPriceCents: number; position: number };
export type DocumentRecord = { id: string; revision: number; projectId: string; number: string; status: string; issueDate: string; dueDate?: string | null; validUntil?: string | null; paidAt?: string | null; notes: string; markupBps: number; subtotalCents: number; totalCents: number; items: LineItem[] };
export type AdminData = { clients: Client[]; projects: Project[]; estimates: DocumentRecord[]; invoices: DocumentRecord[] };
export type DocumentKind = "estimate" | "invoice";
export type Editor = { kind: "client"; record?: Client } | { kind: "project"; record?: Project } | { kind: DocumentKind; record?: DocumentRecord; source?: DocumentRecord };
export function parseMap(project?: { mapJson: string | null }): ProjectMap | null {
  try { return JSON.parse(project?.mapJson || "null"); } catch { return null; }
}
