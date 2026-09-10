export type Position = [number, number]; // latitude, longitude
export type MapFeature = { id: string; kind: "area" | "symbol" | "text"; title: string; color: string; points: Position[]; symbol?: string };
export type ProjectMap = { center: Position; zoom: number; features: MapFeature[] };
export const symbols: Record<string, string> = { prairie: "🌾", flowers: "🌼", tree: "🌳", water: "💧", habitat: "🦋", rock: "🪨" };
export const services = { consultation: "On-site consultation", "native-landscape": "Native landscape", "prairie-wildflower": "Prairie & wildflower plot" };
export const projectStatuses = ["lead", "scheduled", "in-progress", "complete", "on-hold"];
export const estimateStatuses = ["draft", "sent", "accepted", "declined", "void"];
export const invoiceStatuses = ["draft", "sent", "paid", "void"];
export const GOOGLE_REVIEW_URL = "https://g.page/r/Cew3cfkKTNodEBM/review";
export const publicOrigin = "https://www.perfectprairie.com";
export const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export const pretty = (value: string) => value.replaceAll("-", " ").replace(/^./, c => c.toUpperCase());

export class InputError extends Error { status: number; constructor(message: string, status = 400) { super(message); this.status = status; } }
export function text(value: unknown, label: string, max = 2000, required = false) {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string" || value.length > max) throw new InputError(`${label} must be at most ${max} characters.`);
  if (required && !value.trim()) throw new InputError(`${label} is required.`);
  return value.trim();
}
export function choice(value: unknown, values: string[], label: string) {
  if (typeof value !== "string" || !values.includes(value)) throw new InputError(`Choose a valid ${label}.`);
  return value;
}
export function date(value: unknown, label: string, required = false) {
  const result = text(value, label, 10, required);
  if (!result) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) throw new InputError(`${label} must be a valid date.`);
  return result;
}
export function revision(value: unknown) {
  if (!Number.isInteger(value) || Number(value) < 0) throw new InputError("Reload this record before editing.");
  return Number(value);
}
export function id(value: unknown) {
  const result = text(value, "Record ID", 80, true);
  if (!/^[a-f0-9-]{36}$/i.test(result)) throw new InputError("Invalid record ID.");
  return result;
}
export function calculateItems(value: unknown, percent: unknown) {
  const markup = Number(percent);
  if (!Number.isFinite(markup) || markup < 0 || markup > 500 || Math.abs(markup * 100 - Math.round(markup * 100)) > 1e-7) throw new InputError("Markup must be between 0% and 500%, with up to two decimals.");
  const markupBps = Math.round(markup * 100);
  if (!Array.isArray(value) || !value.length || value.length > 50) throw new InputError("Add between 1 and 50 complete line items.");
  const items = value.map((row: Record<string, unknown>) => {
    if (!row || typeof row !== "object") throw new InputError("Invalid line item.");
    const description = text(row.description, "Item description", 500, true);
    const quantity = Number(row.quantity);
    const cost = Number(row.unitCost);
    if (!Number.isFinite(quantity) || quantity < .001 || quantity > 1_000_000 || Math.abs(quantity * 1000 - Math.round(quantity * 1000)) > 1e-6) throw new InputError("Quantity must be positive with up to three decimals.");
    if (row.unitCost === "" || row.unitCost === null || !Number.isFinite(cost) || cost < 0 || cost > 1_000_000 || Math.abs(cost * 100 - Math.round(cost * 100)) > 1e-6) throw new InputError("Unit cost must be between $0 and $1,000,000 with up to two decimals.");
    const quantityMilli = Math.round(quantity * 1000);
    const unitCostCents = Math.round(cost * 100);
    const unitPriceCents = Math.round(unitCostCents * (10_000 + markupBps) / 10_000);
    return { description, quantityMilli, unitCostCents, unitPriceCents, totalCents: Math.round(quantityMilli * unitPriceCents / 1000) };
  });
  const totalCents = items.reduce((sum, item) => sum + item.totalCents, 0);
  if (!Number.isSafeInteger(totalCents) || totalCents > 1e12) throw new InputError("Document total exceeds the supported amount.");
  return { items, totalCents, markupBps };
}
export function areaSqMeters(points: Position[]) {
  if (points.length < 3) return 0;
  const rad = Math.PI / 180;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    area += (b[1] - a[1]) * rad * (2 + Math.sin(a[0] * rad) + Math.sin(b[0] * rad));
  }
  return Math.abs(area * 6371008.8 ** 2 / 2);
}
export const areaLabel = (points: Position[]) => `${Math.round(areaSqMeters(points) * 10.7639104).toLocaleString()} sq ft · ${(areaSqMeters(points) / 4046.8564224).toFixed(2)} acres`;
function hasCrossingEdges(points: Position[]) {
  const cross=(a:Position,b:Position,c:Position)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const on=(a:Position,b:Position,p:Position)=>p[0]>=Math.min(a[0],b[0])&&p[0]<=Math.max(a[0],b[0])&&p[1]>=Math.min(a[1],b[1])&&p[1]<=Math.max(a[1],b[1]);
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
    if(j===i+1||(i===0&&j===points.length-1))continue;
    const a=points[i],b=points[(i+1)%points.length],c=points[j],d=points[(j+1)%points.length];
    const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);
    if((abC*abD<0&&cdA*cdB<0)||(abC===0&&on(a,b,c))||(abD===0&&on(a,b,d))||(cdA===0&&on(c,d,a))||(cdB===0&&on(c,d,b)))return true;
  }
  return false;
}
export function validateMap(value: unknown): ProjectMap | null {
  if (value === null) return null;
  if (!value || typeof value !== "object") throw new InputError("Invalid map.");
  const map = value as ProjectMap;
  const position = (p: Position): Position => {
    if (!Array.isArray(p) || p.length !== 2 || p.some(v => typeof v !== "number" || !Number.isFinite(v)) || Math.abs(p[0]) > 85 || Math.abs(p[1]) > 180) throw new InputError("Invalid map coordinates.");
    return [p[0], p[1]];
  };
  if (!Number.isInteger(map.zoom) || map.zoom < 2 || map.zoom > 22 || !Array.isArray(map.features) || map.features.length > 100) throw new InputError("A map supports up to 100 features and zoom levels 2–22.");
  const used = new Set<string>();
  return { center: position(map.center), zoom: map.zoom, features: map.features.map(f => {
    if (!f || !["area", "text", "symbol"].includes(f.kind)) throw new InputError("Invalid map feature.");
    if (!Array.isArray(f.points) || f.points.length > 200 || f.points.length < (f.kind === "area" ? 3 : 1) || (f.kind !== "area" && f.points.length !== 1)) throw new InputError("Areas need at least three corners; labels need one position.");
    const featureId = id(f.id);
    if (used.has(featureId)) throw new InputError("Duplicate map feature.");
    used.add(featureId);
    if (!/^#[0-9a-f]{6}$/i.test(f.color)) throw new InputError("Choose a valid color.");
    if (f.kind === "symbol" && !symbols[f.symbol ?? ""]) throw new InputError("Choose a valid symbol.");
    const points = f.points.map(position);
    if (f.kind === "area" && areaSqMeters(points) < .01) throw new InputError("Draw an area with at least three different corners.");
    if (f.kind === "area" && (new Set(points.map(p=>p.join(","))).size!==points.length || hasCrossingEdges(points))) throw new InputError("Area edges must not cross or repeat corners. Adjust the shape before saving.");
    return { id: featureId, kind: f.kind, title: text(f.title, "Map label", 120, true), color: f.color, points, ...(f.kind === "symbol" ? { symbol: f.symbol } : {}) };
  }) };
}
