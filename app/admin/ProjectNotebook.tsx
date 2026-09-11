/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AdminData, DocumentKind, Editor, Project, ProjectItem } from "@/lib/admin-types";
import { parseMap } from "@/lib/admin-types";
import { money, pretty } from "@/lib/operations";
import { itemCategories } from "@/lib/project-items";
import MapPreview from "@/app/components/MapPreview";

export default function ProjectNotebook({ project, data, onClose, onEdit, onMap, onItemSaved }: { project: Project; data: AdminData; onClose: () => void; onEdit: (editor: Editor) => void; onMap: () => void; onItemSaved: (item: ProjectItem) => void }) {
  const [editing, setEditing] = useState<ProjectItem | "new" | null>(null), [archived, setArchived] = useState(false);
  const items = data.projectItems.filter(i => i.projectId === project.id);
  const active = items.filter(i => !i.archived), billable = active.filter(i => i.billable);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectionMode,setSelectionMode] = useState(false);
  const forDocument = selectionMode ? billable.filter(i => selected.includes(i.id)) : billable;
  const create = (kind: DocumentKind) => onEdit({ kind, projectId: project.id, projectItems: forDocument });
  return <section className="project-notebook">
    <button onClick={onClose}>← All projects</button>
    <header className="notebook-heading"><div><p className="admin-kicker">Project workspace · {pretty(project.status)}</p><h2>{project.name}</h2><p>{project.siteAddress || "Add a site address in project details"}</p></div><div className="record-actions"><button onClick={() => onEdit({ kind: "project", record: project })}>Edit project details</button><button onClick={onMap}>{parseMap(project) ? "Open map studio" : "Add map"}</button></div></header>
    <div className="notebook-summary"><button className="notebook-map" onClick={onMap}>{parseMap(project) ? <MapPreview map={parseMap(project)!} title={project.name}/> : <span>⌖ Position the site and build a planting plan</span>}</button><div><p className="admin-kicker">Internal planning</p><h3>Field notes</h3><p className="preserve-lines">{project.description || "Site observations, scope and research belong here. Edit project details to add your notes."}</p><p className="field-hint">Notes, supplier links, costs and item photos stay private. Map labels and the customer summary can be shared.</p></div></div>
    <section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">Research → plan → price</p><h2>Project items</h2></div><button className="admin-save" onClick={() => setEditing("new")}>＋ Add project item</button></div>
      <div className="notebook-budget"><span>{active.length} active items</span><strong>{money(billable.reduce((sum, i) => sum + Math.round(i.quantityMilli * i.unitCostCents / 1000), 0))} internal cost</strong><label><input type="checkbox" checked={archived} onChange={e => setArchived(e.target.checked)}/> Show archived</label></div>
      {!active.length && !archived && <div className="office-empty"><h3>Assemble the project here</h3><p>Add seed mixes, plants, materials, labor and research. Put items on the map, then carry billable items into an estimate.</p></div>}
      <div className="project-item-grid">{items.filter(i => archived || !i.archived).map(i => <article key={i.id} className={"project-item-card" + (i.archived ? " archived" : "")}>
        {i.imageKey && <img src={"/api/admin/project-items?image=" + i.id + "&v=" + i.revision} alt={i.name} loading="lazy"/>}
        <div className="project-item-body"><p className="admin-kicker">{itemCategories[i.category as keyof typeof itemCategories]}{i.archived ? " · Archived" : !i.billable ? " · Note only" : ""}</p><h3>{i.name}</h3><p>{i.quantityMilli / 1000} {i.unit} × {money(i.unitCostCents)} <small>internal</small></p>{i.notes && <p className="preserve-lines item-notes">{i.notes}</p>}{i.sourceUrl && <a href={i.sourceUrl} target="_blank" rel="noreferrer">Open source link ↗</a>}<div className="record-actions"><button onClick={() => setEditing(i)}>Edit item</button>{i.billable && !i.archived && <label><input type="checkbox" checked={!selectionMode || selected.includes(i.id)} onChange={e => { const ids = selectionMode ? selected : billable.map(row => row.id); setSelectionMode(true); setSelected(e.target.checked ? [...ids, i.id] : ids.filter(id => id !== i.id)); }}/> Quote item</label>}</div></div>
      </article>)}</div>
      <div className="notebook-document-bar"><p>{selectionMode ? forDocument.length + " selected" : "All " + billable.length + " billable items"} · Copied as independent line items. Private notes and links are excluded.</p><div className="record-actions">{selectionMode && <button onClick={() => setSelectionMode(false)}>Select all billable</button>}<button disabled={!forDocument.length || forDocument.length > 50} onClick={() => create("estimate")}>Create estimate</button><button disabled={!forDocument.length || forDocument.length > 50} onClick={() => create("invoice")}>Create invoice</button></div>{forDocument.length > 50 && <p role="alert">Select at most 50 items for one document.</p>}</div>
    </section>
    <section className="admin-panel"><div className="admin-panel-heading"><h2>Project documents</h2></div>{[...data.estimates.map(d => ({ ...d, kind: "estimate" as const })), ...data.invoices.map(d => ({ ...d, kind: "invoice" as const }))].filter(d => d.projectId === project.id).map(d => <div className="project-document-row" key={d.id}><strong>{d.number}</strong><span>{pretty(d.status)}</span><span>{money(d.totalCents)}</span><button onClick={() => onEdit({ kind: d.kind, record: d })}>Edit {d.kind}</button></div>)}</section>
    {editing && <ItemEditor key={editing === "new" ? "new" : editing.id} projectId={project.id} item={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} onSaved={item => { onItemSaved(item); setEditing(null); }}/>} 
  </section>;
}

function ItemEditor({ projectId, item, onClose, onSaved }: { projectId: string; item?: ProjectItem; onClose: () => void; onSaved: (item: ProjectItem) => void }) {
  const dialog = useRef<HTMLDialogElement>(null), dirty = useRef(false);
  const [recordId] = useState(() => item?.id || crypto.randomUUID()), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const [imageData, setImageData] = useState(""), [removeImage, setRemoveImage] = useState(false), [preparing, setPreparing] = useState(false);
  useEffect(() => { dialog.current?.showModal(); const warn = (e: BeforeUnloadEvent) => { if (dirty.current) e.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, []);
  const close = () => { if (!saving && !preparing && (!dirty.current || confirm("Discard unsaved item changes?"))) onClose(); };
  async function photo(file?: File) {
    if (!file) return;
    setPreparing(true); setError("");
    try {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 20_000_000) throw new Error("Choose a JPEG, PNG or WebP photo smaller than 20 MB.");
      const bitmap = await createImageBitmap(file), scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = window.document.createElement("canvas"); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d"); if (!context) throw new Error("Image preparation is unavailable in this browser.");
      context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      let quality = .86, result = canvas.toDataURL("image/jpeg", quality);
      while (result.length > 1_300_000 && quality > .35) { quality -= .1; result = canvas.toDataURL("image/jpeg", quality); }
      if (result.length > 1_300_000) throw new Error("This photo is too detailed. Choose a smaller crop.");
      setImageData(result); setRemoveImage(false); dirty.current = true;
    } catch (e) { setError(e instanceof Error ? e.message : "Could not prepare photo."); } finally { setPreparing(false); }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const fields = new FormData(e.currentTarget);
      const body = { ...Object.fromEntries(fields), id: recordId, projectId, revision: item?.revision, billable: fields.has("billable"), archived: fields.has("archived"), imageData, removeImage };
      const response = await fetch("/api/admin/project-items", { method: item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string; item: ProjectItem }; if (!response.ok) throw new Error(result.error || "Could not save item.");
      dirty.current = false; onSaved(result.item);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save. Your changes are still here."); } finally { setSaving(false); }
  }
  return <dialog className="record-dialog" ref={dialog} onCancel={e => { e.preventDefault(); close(); }}><div className="dialog-heading"><div><p className="admin-kicker">Private project notebook</p><h2>{item ? "Edit project item" : "Add project item"}</h2></div><button onClick={close} disabled={saving || preparing} aria-label="Close item editor">×</button></div><form onSubmit={save} onChange={() => { dirty.current = true; }}>{error && <p className="form-error" role="alert">{error}</p>}<fieldset disabled={saving || preparing}>
    <label className="admin-field">Item name / map label<input name="name" required maxLength={180} defaultValue={item?.name}/></label><div className="admin-form-row"><label className="admin-field">Category<select name="category" defaultValue={item?.category || "seed-mix"}>{Object.entries(itemCategories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="admin-field">Unit (lb, tray, hour…)<input name="unit" maxLength={30} defaultValue={item?.unit}/></label></div>
    <div className="admin-form-row"><label className="admin-field">Quantity<input name="quantity" type="number" required min=".001" max="1000000" step=".001" defaultValue={item ? item.quantityMilli / 1000 : 1}/></label><label className="admin-field">Unit cost · internal<input name="unitCost" type="number" required min="0" max="1000000" step=".01" defaultValue={item ? (item.unitCostCents / 100).toFixed(2) : "0.00"}/></label></div>
    <label className="checkbox-field"><input type="checkbox" name="billable" defaultChecked={item?.billable ?? true}/> Include in estimates / invoices</label>
    <label className="admin-field">Supplier / research link<input name="sourceUrl" type="url" maxLength={2048} placeholder="https://…" defaultValue={item?.sourceUrl}/></label><label className="admin-field">Internal notes<textarea name="notes" rows={5} maxLength={5000} defaultValue={item?.notes}/></label>
    <label className="admin-field">Reference photo · private<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void photo(e.target.files?.[0])}/></label><p className="field-hint">JPEG, PNG or WebP, up to 20 MB. Optimized for the notebook; original file is not retained.</p>
    {(imageData || item?.imageKey) && !removeImage && <div className="item-photo-preview"><img src={imageData || "/api/admin/project-items?image=" + item!.id} alt="Item reference preview"/><button type="button" onClick={() => { setImageData(""); setRemoveImage(true); dirty.current = true; }}>Remove photo</button></div>}
    {item && <label className="checkbox-field"><input type="checkbox" name="archived" defaultChecked={item.archived}/> Archive item (keep its history and existing map placements)</label>}
    </fieldset><div className="dialog-actions"><button type="button" onClick={close} disabled={saving || preparing}>Cancel</button><button className="admin-save" disabled={saving || preparing}>{preparing ? "Preparing photo…" : saving ? "Saving…" : "Save project item"}</button></div></form></dialog>;
}
