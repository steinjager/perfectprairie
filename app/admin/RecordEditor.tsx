"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AdminData, Editor, DocumentRecord } from "@/lib/admin-types";
import { calculateItems, estimateStatuses, invoiceStatuses, money, pretty, projectStatuses, services } from "@/lib/operations";
type DraftItem = { key: string; description: string; quantity: string; unitCost: string };
export default function RecordEditor({ editor, data, onSaved, onClose }: { editor: Editor; data: AdminData; onSaved: () => Promise<void>; onClose: () => void }) {
  const dialog=useRef<HTMLDialogElement>(null), dirty=useRef(false);
  const [requestId]=useState(()=>crypto.randomUUID()), [error,setError]=useState(""), [saving,setSaving]=useState(false);
  const document = editor.kind==="estimate"||editor.kind==="invoice";
  const source = document ? editor.record || editor.source : undefined;
  const [markup,setMarkup]=useState(String(source ? source.markupBps/100 : 30));
  const [status,setStatus]=useState(source && editor.record ? source.status : "draft");
  const [items,setItems]=useState<DraftItem[]>(()=>source?.items.map(i=>({key:crypto.randomUUID(),description:i.description,quantity:String(i.quantityMilli/1000),unitCost:((i.unitCostCents??i.unitPriceCents)/100).toFixed(2)}))||[{key:crypto.randomUUID(),description:"",quantity:"1",unitCost:"0.00"}]);
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
      if(document){calculateItems(items,markup);body.items=items;body.markupPercent=markup;body.kind=editor.kind;}
      const endpoint=document?"documents":editor.kind==="client"?"clients":"projects";
      const response=await fetch("/api/admin/"+endpoint,{method:editor.record?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const result=await response.json() as { error?: string };if(!response.ok)throw new Error(result.error||"Could not save.");
      dirty.current=false;await onSaved();onClose();
    }catch(err){setError(err instanceof Error?err.message:"Could not save. Your changes are still here.");}finally{setSaving(false);}
  }
  return <dialog className="record-dialog" ref={dialog} onCancel={e=>{e.preventDefault();close();}}><div className="dialog-heading"><div><p className="admin-kicker">{editor.record?"Edit record":"New record"}</p><h2>{editor.record ? document?(editor.record as DocumentRecord).number:pretty(editor.kind) : "Create "+editor.kind}</h2></div><button onClick={close} disabled={saving} aria-label="Close editor">×</button></div>
    <form onSubmit={submit} onChange={()=>{dirty.current=true;}}>
      {error&&<div className="form-error" role="alert">{error}</div>}
      <fieldset disabled={saving}>
      {editor.kind==="client"&&<><div className="admin-form-row">{field("firstName","First name","text",true,100)}{field("lastName","Last name","text",true,100)}</div>{field("organization","Organization","text",false,160)}<div className="admin-form-row">{field("email","Email","email",false,160)}{field("phone","Phone","tel",false,80)}</div>{field("address","Street address","text",false,240)}<div className="admin-form-row">{field("city","City","text",false,120)}{field("state","State","text",false,2,record.state?String(record.state):"IL")}{field("postalCode","ZIP","text",false,20)}</div>{textarea("notes","Internal notes")}</>}
      {editor.kind==="project"&&<>
        {select("clientId","Client",data.clients.map(c=>({value:c.id,label:c.firstName+" "+c.lastName})))}
        {field("name","Project name","text",true,180)}
        <div className="admin-form-row">{select("serviceType","Service",Object.entries(services).map(([value,label])=>({value,label})),"consultation")}{select("status","Status",projectStatuses.map(value=>({value,label:pretty(value)})),"lead")}</div>
        {field("siteAddress","Site address","text",false,300)}{field("targetStartDate","Target start","date")}
        {textarea("publicSummary","Customer-facing project summary",4000)}{textarea("description","Internal scope / field notes")}
        <p className="field-hint">The customer summary and map appear on shared project pages. Internal field notes stay in the Field Office.</p>
      </>}
      {document&&<>
        {select("projectId","Project",data.projects.map(p=>({value:p.id,label:p.name})))}
        <div className="admin-form-row">{field("issueDate","Issue date","date",true,10,source&&editor.record?source.issueDate:new Date().toLocaleDateString("en-CA"))}{field("dueDate",editor.kind==="invoice"?"Due date":"Valid until","date",false,10,source?.dueDate||source?.validUntil||"")}</div>
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
        </section>{textarea("notes","Customer notes / payment terms")}
      </>}
      </fieldset><div className="dialog-actions"><button type="button" onClick={close} disabled={saving}>Cancel</button><button className="admin-save" disabled={saving}>{saving?"Saving…":"Save "+editor.kind}</button></div>
    </form>
  </dialog>;
}
