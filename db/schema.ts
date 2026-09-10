import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  revision: integer("revision").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  organization: text("organization").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  state: text("state").notNull().default("IL"),
  postalCode: text("postal_code").notNull().default(""),
  notes: text("notes").notNull().default(""),
  ...timestamps,
}, (table) => [
  index("idx_clients_name").on(table.lastName, table.firstName),
  index("idx_clients_email").on(table.email),
]);

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  serviceType: text("service_type").notNull(),
  status: text("status").notNull().default("lead"),
  siteAddress: text("site_address").notNull().default(""),
  description: text("description").notNull().default(""),
  targetStartDate: text("target_start_date"),
  publicSummary: text("public_summary").notNull().default(""),
  mapJson: text("map_json"),
  shareToken: text("share_token"),
  ...timestamps,
}, (table) => [
  index("idx_projects_client_id").on(table.clientId),
  index("idx_projects_status").on(table.status),
  uniqueIndex("idx_projects_share_token").on(table.shareToken),
]);

export const estimates = sqliteTable("estimates", {
  markupBps: integer("markup_bps").notNull().default(0),
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  status: text("status").notNull().default("draft"),
  issueDate: text("issue_date").notNull(),
  validUntil: text("valid_until"),
  notes: text("notes").notNull().default(""),
  subtotalCents: integer("subtotal_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull().default(0),
  ...timestamps,
}, (table) => [
  uniqueIndex("idx_estimates_number").on(table.number),
  index("idx_estimates_project_id").on(table.projectId),
  index("idx_estimates_status").on(table.status),
]);

export const estimateItems = sqliteTable("estimate_items", {
  unitCostCents: integer("unit_cost_cents"),
  id: text("id").primaryKey(),
  estimateId: text("estimate_id").notNull().references(() => estimates.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantityMilli: integer("quantity_milli").notNull().default(1000),
  unitPriceCents: integer("unit_price_cents").notNull().default(0),
  position: integer("position").notNull().default(0),
}, (table) => [index("idx_estimate_items_estimate_id").on(table.estimateId)]);

export const invoices = sqliteTable("invoices", {
  markupBps: integer("markup_bps").notNull().default(0),
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  status: text("status").notNull().default("draft"),
  issueDate: text("issue_date").notNull(),
  dueDate: text("due_date"),
  notes: text("notes").notNull().default(""),
  subtotalCents: integer("subtotal_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull().default(0),
  paidAt: text("paid_at"),
  ...timestamps,
}, (table) => [
  uniqueIndex("idx_invoices_number").on(table.number),
  index("idx_invoices_project_id").on(table.projectId),
  index("idx_invoices_status").on(table.status),
]);

export const invoiceItems = sqliteTable("invoice_items", {
  unitCostCents: integer("unit_cost_cents"),
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantityMilli: integer("quantity_milli").notNull().default(1000),
  unitPriceCents: integer("unit_price_cents").notNull().default(0),
  position: integer("position").notNull().default(0),
}, (table) => [index("idx_invoice_items_invoice_id").on(table.invoiceId)]);

export const documentCounters = sqliteTable("document_counters", {
  kind: text("kind").notNull(),
  year: integer("year").notNull(),
  value: integer("value").notNull().default(0),
}, (table) => [primaryKey({ columns: [table.kind, table.year] })]);
