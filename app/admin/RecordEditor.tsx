"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AdminData, Editor, DocumentRecord, Client, Project } from "@/lib/admin-types";
import { calculateItems, estimateStatuses, invoiceStatuses, money, pretty, projectStatuses, services } from "@/lib/operations";
import { projectItemLines } from "@/lib/project-items";
import {parseMap} from "@/lib/admin-types";
import MapPreview from "@/app/components/MapPreview";
type DraftItem = { key: string; description: string; quantity: string; unitCost: string };
export default function RecordEditor({ editor, data, onSaved, onClose }: { editor: Editor; data: AdminData; onSaved: (result: {client?:Client;project?:Project}) => Promise<void>; onClose: () => void }) {
  const dialog=useRef<HTMLDialogElement>(null), dirty=useRef(false);
  const [requestId]=useState(()=>crypto.randomUUID()), [error,setError]=useState(""), [saving,setSaving]=useState(false);
  const [addingClient,setAddingClient]=useState(false),[newClients,setNewClients]=useState<Client[]>([]);
  const [clientId,setClientId]=useState(editor.kind==="project" ? editor.record?.clientId || editor.clientId || "" : "");
  const document = editor.kind==="estimate"||editor.kind==="invoice";
  const source = document ? editor.record || editor.source : undefined;
  const [projectId,setProjectId]=useState(document ? source?.projectId || editor.projectId || "" : "");
  const [planAction,setPlanAction]=useState<"keep"|"attach"|"remove">(editor.record?"keep":"attach");
  const savedMap=parseMap(data.projects.find(p=>p.id===projectId));
  const attachedMap=planAction==="remove" ? null : planAction==="keep" ? parseMap({mapJson:source?.projectId===projectId?source.planJson||null:null}) : savedMap;
  const [markup,setMarkup]=useState(String(source ? source.markupBps/100 : 30));
  const [status,setStatus]=useState(source && editor.record ? source.status : "draft");
  const [items,setItems]=useState<DraftItem[]>(()=>source?.items.map(i=>({key:crypto.randomUUID(),description:i.description,quantity:String(i.quantityMilli/1000),unitCost:((i.unitCostCents??i.unitPriceCents)/100).toFixed(2)})) || (document && editor.projectItems?.some(i=>i.billable&&!i.archived) ? projectItemLines(editor.projectItems) : [{key:crypto.randomUUID(),description:"",quantity:"1",unitCost:"0.00"}]));
  const record = (editor.record || source || {}) as unknown as Record<string, string | number | null>;
  useEffect(()=>{
    dialog.current?.showModal();
    const warn=(e:BeforeUnloadEvent)=>{if(dirty.current)e.preventDefault();};
    window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);
  },[]);
  function close(){if(!saving&&(!dirty.current||confirm("Discard unsaved changes?")))onClose();}
  function updateItem(index:number, key:keyof DraftItem,value:string){dirty.current=true;setItems(rows=>rows.map((row,i)=>i===index?{...row,[key]:value}:row));}
  let pricing: ReturnType<typeof calculateItems>|null=null;
  try{pricing=calculateItems(items,markup);}catch{}
  const costTotal=items.reduce((sum,i)=>sum+Math.round(Number(i.quantity)*Number(i.unitCost)*100),0);
  function field(name:string,label:string,type="text",required=false,max=2000,defaultValue?:string) {
    return <label className="admin-field" key={name}><span>{label}</span><input name={name} type={type} required={required} maxLength={max} defaultValue={defaultValue ?? String(record[name]??"")} /></label>;
  }
  function select(name:string,label:string,options:{value:string;label:string}[],fallback="") {
    return <label className="admin-field"><span>{label}</span><select name={name} required defaultValue={String(record[name]??fallback)}><option value="">Choose {label.toLowerCase()}</option>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
  }
  function textarea(name:string,label:string,max=2000) {return <label className="admin-field"><span>{label}</span><textarea name={name} maxLength={max} rows={4} defaultValue={String(record[name]??"")}/></label>;}
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setError("");setSaving(true);
    try{
      const body:Record<string,unknown>={...Object.fromEntries(new FormData(e.currentTarget)),id:editor.record?.id||requestId,revision:editor.record?.revision};
      if(document){calculateItems(items,markup);body.items=items;body.markupPercent=markup;body.kind=editor.kind;if(editor.kind==="estimate")body.planAction=planAction;}
      const endpoint=document?"documents":editor.kind==="client"?"clients":"projects";
      const response=await fetch("/api/admin/"+endpoint,{method:editor.record?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const result=await response.json() as { error?: string; client?:Client; project?:Project };if(!response.ok)throw new Error(result.error||"Could not save.");
      dirty.current=false;await onSaved(result);onClose();
    }catch(err){setError(err instanceof Error?err.message:"Could not save. Your changes are still here.");}finally{setSaving(false);}
  }
  return <><dialog className="record-dialog" ref={dialog} onCancel={e=>{e.preventDefault();close();}}><div className="dialog-heading"><div><p className="admin-kicker">{editor.record?"Edit record":"New record"}</p><h2>{editor.record ? document?(editor.record as DocumentRecord).number:pretty(editor.kind) : "Create "+editor.kind}</h2></div><button onClick={close} disabled={saving} aria-label="Close editor">×</button></div>
    <form onSubmit={submit} onChange={()=>{dirty.current=true;}}>
      {error&&<div className="form-error" role="alert">{error}</div>}
      <fieldset disabled={saving}>
      {editor.kind==="client"&&<><div className="admin-form-row">{field("firstName","First name","text",true,100)}{field("lastName","Last name","text",true,100)}</div>{field("organization","Organization","text",false,160)}<div className="admin-form-row">{field("email","Email","email",false,160)}{field("phone","Phone","tel",false,80)}</div>{field("address","Street address","text",false,240)}<div className="admin-form-row">{field("city","City","text",false,120)}{field("state","State","text",false,2,record.state?String(record.state):"IL")}{field("postalCode","ZIP","text",false,20)}</div>{textarea("notes","Internal notes")}</>}
      {editor.kind==="project"&&<>
        <div className="project-client-picker"><label className="admin-field"><span>Client</span><select name="clientId" required value={clientId} onChange={e=>setClientId(e.target.value)}><option value="">Choose client</option>{[...data.clients,...newClients.filter(c=>!data.clients.some(existing=>existing.id===c.id))].map(c=><option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}</select></label><button type="button" onClick={()=>setAddingClient(true)}>＋ Add client</button></div>
        {field("name","Project name","text",true,180)}
        <div className="admin-form-row">{select("serviceType","Service",Object.entries(services).map(([value,label])=>({value,label})),"consultation")}{select("status","Status",projectStatuses.map(value=>({value,label:pretty(value)})),"lead")}</div>
        {field("siteAddress","Site address","text",false,300)}
        {textarea("publicSummary","Customer-facing project summary",4000)}{textarea("description","Internal scope / field notes")}
        <p className="field-hint">The customer summary and map appear on shared project pages. Internal field notes stay in the Field Office.</p>
      </>}
      {document&&<>
        <label className="admin-field"><span>Project</span><select name="projectId" required value={projectId} onChange={e=>{const next=e.target.value;if(items.some(i=>i.description)&&!confirm("Change the linked project? Current line items will be kept until you explicitly replace them."))return;setProjectId(next);setPlanAction("attach");}}><option value="">Choose project</option>{data.projects.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
        {editor.kind==="estimate"&&projectId&&<section className="estimate-map-attachment"><h3>Planting plan attachment</h3><p className="field-hint">Attach a saved layout by clicking or dragging it into the attachment area. Each estimate keeps its own copy.</p><div className="estimate-map-grid">{savedMap?<div draggable onDragStart={e=>{e.dataTransfer.setData("text/x-prairie-project",projectId);e.dataTransfer.effectAllowed="copy";}}><MapPreview map={savedMap}/><button type="button" onClick={()=>{dirty.current=true;setPlanAction("attach");}}>Attach saved map</button></div>:<p>Save a map in this project before attaching a new layout.</p>}<div className="estimate-map-drop" onDragOver={e=>{if(e.dataTransfer.types.includes("text/x-prairie-project")){e.preventDefault();e.dataTransfer.dropEffect="copy";}}} onDrop={e=>{e.preventDefault();if(e.dataTransfer.getData("text/x-prairie-project")===projectId){dirty.current=true;setPlanAction("attach");}}}>{attachedMap?<><strong>Map attached</strong><MapPreview map={attachedMap}/><button type="button" onClick={()=>{dirty.current=true;setPlanAction("remove");}}>Remove attachment</button></>:<p>Drop saved map here, or choose Attach saved map.</p>}</div></div></section>}
        {projectId&&<div className="project-import-panel"><p>Project items are copied, not linked. Later planning changes never alter this document.</p><button type="button" disabled={!data.projectItems.some(i=>i.projectId===projectId&&i.billable&&!i.archived)} onClick={()=>{const lines=projectItemLines(data.projectItems.filter(i=>i.projectId===projectId));if(lines.length>50){setError("Select at most 50 items from the project notebook.");return;}if(items.some(i=>i.description)&&!confirm("Replace this document's current line items with the project's billable items?"))return;dirty.current=true;setItems(lines);}}>Replace with project items</button></div>}
        <div className="admin-form-row">{field("issueDate","Issue date","date",true,10,source&&editor.record?source.issueDate:new Date().toLocaleDateString("en-CA"))}{field("dueDate",editor.kind==="invoice"?"Due date":"Valid until","date",false,10,editor.record?(source?.dueDate||source?.validUntil||""):"")}</div>
        <div className="admin-form-row"><label className="admin-field"><span>Status</span><select name="status" value={status} onChange={e=>setStatus(e.target.value)}>{(editor.kind==="invoice"?invoiceStatuses:estimateStatuses).map(s=><option key={s}>{s}</option>)}</select></label>{editor.kind==="invoice"&&status==="paid"&&field("paidAt","Paid on","date",true,10,source?.paidAt||new Date().toLocaleDateString("en-CA"))}</div>
        <div className="markup-panel"><label className="admin-field"><span>Internal markup %</span><input type="number" min="0" max="500" step=".01" required value={markup} onChange={e=>setMarkup(e.target.value)}/></label><p>Added to each unit cost. A $100 cost at 30% becomes $130. Customers see only the final prices.</p></div>
        <section className="item-editor"><div className="item-heading"><h3>Line items</h3><button type="button" disabled={items.length>=50} onClick={()=>{dirty.current=true;setItems(rows=>[...rows,{key:crypto.randomUUID(),description:"",quantity:"1",unitCost:"0.00"}]);}}>＋ Add item</button></div>
          {items.map((item,index)=><div className="editable-item" key={item.key}>
            <label><span>Description</span><textarea required maxLength={500} rows={2} value={item.description} onChange={e=>updateItem(index,"description",e.target.value)}/></label>
            <label><span>Quantity</span><input type="number" min=".001" max="1000000" step=".001" required value={item.quantity} onChange={e=>updateItem(index,"quantity",e.target.value)}/></label>
            <label><span>Unit cost · internal</span><input type="number" min="0" max="1000000" step=".01" required value={item.unitCost} onChange={e=>updateItem(index,"unitCost",e.target.value)}/></label>
            <div className="item-price"><span>Customer total</span><strong>{pricing?money(pricing.items[index].totalCents):"—"}</strong>{pricing&&<small>{money(pricing.items[index].unitPriceCents)} / unit</small>}</div>
            <div className="item-actions"><button type="button" aria-label={"Move item "+(index+1)+" up"} disabled={index===0} onClick={()=>{dirty.current=true;setItems(rows=>{const next=[...rows];[next[index-1],next[index]]=[next[index],next[index-1]];return next;});}}>↑</button><button type="button" aria-label={"Remove item "+(index+1)} disabled={items.length===1} onClick={()=>{dirty.current=true;setItems(rows=>rows.filter((_,i)=>i!==index));}}>×</button></div>
          </div>)}
          <div className="pricing-totals"><span>Internal cost <b>{Number.isFinite(costTotal)?money(costTotal):"—"}</b></span><span>Markup amount <b>{pricing?money(pricing.totalCents-costTotal):"—"}</b></span><strong>Customer total <b>{pricing?money(pricing.totalCents):"—"}</b></strong></div>
        </section><input type="hidden" name="notes" value={String(record.notes||"")}/>
      </>}
      </fieldset><div className="dialog-actions"><button type="button" onClick={close} disabled={saving}>Cancel</button><button className="admin-save" disabled={saving}>{saving?"Saving…":"Save "+editor.kind}</button></div>
    </form>
  </dialog>{addingClient&&<RecordEditor editor={{kind:"client"}} data={data} onClose={()=>setAddingClient(false)} onSaved={async result=>{if(result.client){setNewClients(rows=>[...rows,result.client!]);setClientId(result.client.id);dirty.current=true;}setAddingClient(false);}}/>}</>;
}
