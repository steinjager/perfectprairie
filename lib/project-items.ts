import type { ProjectItem } from "./admin-types";
import { calculateItems, choice, InputError, text } from "./operations";

export const itemCategories = { "seed-mix": "Seed mix", plants: "Plants", material: "Materials", labor: "Labor", note: "Field note", other: "Other" };
export function validatePhoto(bytes: Uint8Array) {
  if (bytes.length > 1_000_000 || bytes.length < 32 || bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) throw new InputError("Invalid photo or photo exceeds 1 MB.");
  // Check JPEG structure and dimensions, not just the caller's MIME label.
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset++] !== 255) break;
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) break;
    const length = bytes[offset] * 256 + bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) break;
    if ([0xc0,0xc1,0xc2].includes(marker)) {
      const height = bytes[offset + 3] * 256 + bytes[offset + 4], width = bytes[offset + 5] * 256 + bytes[offset + 6];
      if (length >= 8 && width > 0 && height > 0 && width <= 1600 && height <= 1600) return;
      break;
    }
    offset += length;
  }
  throw new InputError("The photo could not be validated. Choose a JPEG, PNG or WebP using the image picker.");
}
export function validateProjectItem(input: Record<string, unknown>) {
  const name = text(input.name, "Item name", 180, true);
  const { items: [price] } = calculateItems([{ description: name, quantity: input.quantity, unitCost: input.unitCost }], 0);
  const sourceUrl = text(input.sourceUrl, "Source link", 2048);
  if (sourceUrl) {
    let url: URL;
    try { url = new URL(sourceUrl); } catch { throw new InputError("Enter a complete https:// source link."); }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new InputError("Source links must use http or https without credentials.");
  }
  if (typeof input.billable !== "boolean" || typeof input.archived !== "boolean") throw new InputError("Invalid item settings.");
  return { name, category: choice(input.category, Object.keys(itemCategories), "item category"), quantityMilli: price.quantityMilli, unitCostCents: price.unitCostCents,
    unit: text(input.unit, "Unit", 30), notes: text(input.notes, "Internal notes", 5000), sourceUrl, billable: input.billable, archived: input.archived };
}
// Customer descriptions are deliberate snapshots, never a dump of private research.
export function projectItemLines(items: ProjectItem[]) {
  return items.filter(i => i.billable && !i.archived).map(i => ({ key: crypto.randomUUID(), description: i.name + (i.unit ? ` (${i.unit})` : ""), quantity: String(i.quantityMilli / 1000), unitCost: (i.unitCostCents / 100).toFixed(2) }));
}
