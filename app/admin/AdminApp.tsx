"use client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdminData, DocumentKind, DocumentRecord, Editor, Project } from "@/lib/admin-types";
import { parseMap } from "@/lib/admin-types";
import { estimateStatuses, invoiceStatuses, money, pretty, projectStatuses, publicOrigin, services } from "@/lib/operations";
import RecordEditor from "./RecordEditor";
import MapWorkspace from "./MapWorkspace";
import MapLibrary from "./MapLibrary";
import MapPreview from "@/app/components/MapPreview";
import CustomerDocument from "@/app/components/CustomerDocument";
import ProjectNotebook from "./ProjectNotebook";

type View = "overview" | "clients" | "projects" | "mapped" | "estimates" | "invoices";
const emptyData:AdminData={clients:[],projects:[],estimates:[],invoices:[],projectItems:[]};
export default function AdminApp({userEmail}:{userEmail:string}){
  const [data,setData]=useState<AdminData>(emptyData),[view,setView]=useState<View>("overview");
  const [editor,setEditor]=useState<Editor|null>(null),[mapProject,setMapProject]=useState<Project|null>(null);
  const [openProjectId,setOpenProjectId]=useState<string|null>(null);
  const [preview,setPreview]=useState<{record:DocumentRecord;kind:DocumentKind}|null>(null);
  const [loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [search,setSearch]=useState(""),[filter,setFilter]=useState(""),[busy,setBusy]=useState("");
  const load=useCallback(async()=>{
    const response=await fetch("/api/admin/overview",{cache:"no-store"});
    if(!response.ok)throw new Error("Could not load the Field Office. Refresh the page or sign in again.");
    setData(await response.json());setLoading(false);
  },[]);
  useEffect(()=>{const timer=setTimeout(()=>{void load().catch(e=>{setError(e.message);setLoading(false);});},0);return()=>clearTimeout(timer);},[load]);
  const clients=useMemo(()=>new Map(data.clients.map(c=>[c.id,c])),[data.clients]);
  const projects=useMemo(()=>new Map(data.projects.map(p=>[p.id,p])),[data.projects]);
  const clientName=(id:string)=>{const c=clients.get(id);return c?c.firstName+" "+c.lastName:"Client";};
  const projectName=(id:string)=>projects.get(id)?.name||"Project";
  const mapped=useMemo(()=>data.projects.filter(p=>parseMap(p)),[data.projects]);
  const match=(value:string)=>value.toLowerCase().includes(search.toLowerCase());
  const setSection=(next:View)=>{if(mapProject){setNotice("Save your map or use Back to project before navigating.");return;}setView(next);setOpenProjectId(null);setSearch("");setFilter("");};
  async function saved(result?:{project?:Project}){try{await load();setNotice("Changes saved.");if(editor?.kind==="project"&&editor.openMap&&result?.project)setMapProject(result.project);}catch{setError("Your changes were saved, but the record list could not refresh. Reload records before editing again.");}}
  async function share(project:Project,enable:boolean){
    setBusy(project.id);setError("");
    try{
      const response=await fetch("/api/admin/project-map",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:project.id,revision:project.revision,sharing:enable})});
      const result=await response.json() as { error?: string };if(!response.ok)throw new Error(result.error||"Could not change sharing.");
      await load();setNotice(enable?"Customer link enabled. Anyone with the link can view the customer summary, map and sent documents.":"Customer link revoked. Previously shared links will no longer work.");
    }catch(e){setError(e instanceof Error?e.message:"Could not change sharing.");}finally{setBusy("");}
  }
  async function copyLink(project:Project){
    try{await navigator.clipboard.writeText(publicOrigin+"/projects/"+project.shareToken);setNotice("Customer project link copied.");}
    catch{setError("Clipboard unavailable. Open the customer page and copy its address.");}
  }
  function newRecord(){
    if(mapProject){setNotice("Save your map or use Back to project first.");return;}
    if(view==="clients")setEditor({kind:"client"});
    else if(view==="estimates"||view==="invoices"){
      if(!data.projects.length){setNotice("Add a client and project before creating a document.");setSection("projects");return;}
      setEditor({kind:view==="estimates"?"estimate":"invoice"});
    }else{
      setEditor({kind:"project",openMap:view==="mapped"});
    }
  }
  const projectCard=(p:Project)=><article className="project-card" key={p.id}>
    {parseMap(p)?<button className="project-map-thumbnail" onClick={()=>setMapProject(p)} aria-label={"Edit map for "+p.name}><MapPreview map={parseMap(p)!} title={p.name}/></button>:<button className="project-map-empty" onClick={()=>setMapProject(p)}><span>＋</span>Add a planting map</button>}
    <div className="project-card-body"><div className="record-eyebrow"><span>{services[p.serviceType as keyof typeof services]}</span><Status value={p.status}/></div><h2>{p.name}</h2><p>{clientName(p.clientId)}</p>{p.siteAddress&&<p className="field-hint">{p.siteAddress}</p>}
      <div className="record-actions"><button className="admin-save" onClick={()=>{setOpenProjectId(p.id);setView("projects");}}>Open project & items</button><button onClick={()=>setEditor({kind:"project",record:p})}>Edit details</button><button onClick={()=>{setOpenProjectId(p.id);setMapProject(p);}}>{parseMap(p)?"Edit map":"Add map"}</button></div>
      <div className="project-sharing">{p.shareToken?<><a href={publicOrigin+"/projects/"+p.shareToken} target="_blank" rel="noreferrer">View customer page ↗</a><button onClick={()=>void copyLink(p)}>Copy link</button><button disabled={busy===p.id} onClick={()=>{if(confirm("Revoke this customer's link? Existing links will stop working."))void share(p,false);}}>Revoke</button></>:<button disabled={busy===p.id} onClick={()=>void share(p,true)}>Enable customer link</button>}</div>
    </div>
  </article>;
  const records=view==="invoices"?data.invoices:data.estimates;
  const kind:DocumentKind=view==="invoices"?"invoice":"estimate";
  return <main className="admin-shell">
    <aside className="admin-sidebar"><a className="admin-brand" href="/admin"><Image src="/images/perfect-prairie-logo-carolina-mantis.png" width={58} height={56} alt="" priority unoptimized/><strong>Perfect Prairie</strong><small>Field Office</small></a>
      <nav aria-label="Operations">{(["overview","clients","projects","mapped","estimates","invoices"] as View[]).map(v=><button key={v} className={v===view?"active":""} onClick={()=>setSection(v)}><span aria-hidden="true">{({overview:"⌂",clients:"◌",projects:"◇",mapped:"⌖",estimates:"≋",invoices:"$"})[v]}</span>{pretty(v)}{v!=="overview"&&<b>{v==="mapped"?mapped.length:data[v].length}</b>}</button>)}</nav>
      <div className="admin-user"><span>PP</span><div><small>Signed in as</small><strong>{userEmail}</strong><a href="/cdn-cgi/access/logout">Sign out</a></div></div>
    </aside>
    <section className="admin-workspace">{!mapProject&&<header className="admin-topbar"><div><p>Perfect Prairie · Field Office</p><h1>{view==="overview"?"The work ahead":view==="mapped"?"On the map":pretty(view)}</h1></div><button className="admin-new" onClick={newRecord}>＋ New {view==="clients"?"client":view==="estimates"?"estimate":view==="invoices"?"invoice":"project"}</button></header>}
      {error&&<div className="admin-alert" role="alert">{error}<button onClick={()=>{setError("");void load().catch(e=>setError(e.message));}}>Reload records</button></div>}
      {notice&&<div className="office-notice" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Dismiss notification">×</button></div>}
      {loading?<p className="admin-content">Loading your Field Office…</p>:mapProject?<MapWorkspace project={mapProject} clients={data.clients} initial={parseMap(mapProject)} items={data.projectItems.filter(i=>i.projectId===mapProject.id)} onClose={()=>{setOpenProjectId(mapProject.id);setMapProject(null);}} onSave={async (map,details)=>{
        const response=await fetch("/api/admin/project-map",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:mapProject.id,revision:mapProject.revision,map,details})});
        const result=await response.json() as { error?: string; project: Project };if(!response.ok)throw new Error(result.error||"Could not save map.");
        setData(data=>({...data,projects:data.projects.map(p=>p.id===result.project.id?result.project:p)}));setNotice("Map saved.");setOpenProjectId(mapProject.id);setView("projects");setMapProject(null);
      }}/>:openProjectId&&projects.has(openProjectId)?<div className="admin-content"><ProjectNotebook project={projects.get(openProjectId)!} data={data} onClose={()=>setOpenProjectId(null)} onEdit={setEditor} onMap={()=>setMapProject(projects.get(openProjectId)!)} onItemSaved={item=>{setData(data=>({...data,projectItems:data.projectItems.some(i=>i.id===item.id)?data.projectItems.map(i=>i.id===item.id?item:i):[...data.projectItems,item]}));setNotice("Project item saved.");}}/></div>:<div className="admin-content">
        {view==="overview"?<><section className="admin-metrics"><Metric label="Active projects" value={String(data.projects.filter(p=>!["complete","on-hold"].includes(p.status)).length)} onClick={()=>setSection("projects")}/><Metric label="Open estimates" value={String(data.estimates.filter(e=>["draft","sent"].includes(e.status)).length)} onClick={()=>setSection("estimates")}/><Metric label="Awaiting payment" value={money(data.invoices.filter(i=>i.status==="sent").reduce((s,i)=>s+i.totalCents,0))} onClick={()=>setSection("invoices")}/></section>
          <section className="admin-panel"><div className="admin-panel-heading"><h2>Projects in the field</h2><button onClick={()=>setSection("projects")}>All projects →</button></div>{data.projects.length?<div className="project-grid">{data.projects.slice(0,4).map(projectCard)}</div>:<Empty title="Make room for your first project" text="Add a client, then connect their project, planting plan, estimate and invoice."/>}</section></>:
        view==="mapped"?<MapLibrary data={data} onEstimate={p=>setEditor({kind:"estimate",projectId:p.id,projectItems:data.projectItems.filter(i=>i.projectId===p.id)})} onCreate={clientId=>setEditor({kind:"project",clientId,openMap:true})} onOpen={p=>{setView("projects");setOpenProjectId(p.id);}} onMap={p=>setMapProject(p)} onRemove={async p=>{try{const response=await fetch("/api/admin/project-map",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:p.id,revision:p.revision,map:null})});const result=await response.json() as {error?:string;project:Project};if(!response.ok)throw new Error(result.error||"Could not remove map.");setData(data=>({...data,projects:data.projects.map(row=>row.id===p.id?result.project:row)}));setNotice("Map removed. Project and existing estimate attachments retained.");}catch(e){setError(e instanceof Error?e.message:"Could not remove map.");}}}/>:
        <><div className="record-toolbar"><label><span className="sr-only">Search {view}</span><input type="search" placeholder={"Search "+view+"…"} value={search} onChange={e=>setSearch(e.target.value)}/></label>{view!=="clients"&&<label><span className="sr-only">Filter status</span><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">All statuses</option>{(view==="projects"?projectStatuses:view==="invoices"?invoiceStatuses:estimateStatuses).map(s=><option key={s} value={s}>{pretty(s)}</option>)}</select></label>}</div>
        {view==="clients"?<div className="client-grid">{data.clients.filter(c=>match([c.firstName,c.lastName,c.organization,c.email,c.phone].join(" "))).map(c=><article className="client-card" key={c.id}><div className="client-avatar">{c.firstName[0]}{c.lastName[0]}</div><h2>{c.firstName} {c.lastName}</h2><p>{c.organization||"Residential client"}</p><dl><dt>Email</dt><dd>{c.email?<a href={"mailto:"+c.email}>{c.email}</a>:"—"}</dd><dt>Phone</dt><dd>{c.phone||"—"}</dd><dt>Projects</dt><dd>{data.projects.filter(p=>p.clientId===c.id).length}</dd></dl><button onClick={()=>setEditor({kind:"client",record:c})}>Edit client</button></article>)}{!data.clients.length&&<Empty title="Your client list starts here" text="Add the people and organizations you work with."/>}</div>:
        view==="projects"?<div className="project-grid">{data.projects.filter(p=>(!filter||p.status===filter)&&match(p.name+" "+clientName(p.clientId)+" "+p.siteAddress)).map(projectCard)}{!data.projects.length&&<Empty title="No projects yet" text="Create a project to begin a planting plan."/>}</div>:
        <div className="admin-panel"><div className="admin-table-wrap"><table className="records-table"><thead><tr><th>Document / project</th><th>Issued</th><th>Status</th><th>Total</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{records.filter(d=>(!filter||d.status===filter)&&match(d.number+" "+projectName(d.projectId))).map(d=><tr key={d.id}><td><strong>{d.number}</strong><span>{projectName(d.projectId)}</span></td><td>{d.issueDate}</td><td><Status value={d.status}/></td><td><strong>{money(d.totalCents)}</strong><small>{d.markupBps/100}% internal markup</small></td><td><div className="record-actions"><button onClick={()=>setEditor({kind,record:d})}>Edit</button><button onClick={()=>setPreview({record:d,kind})}>Preview / PDF</button>{kind==="estimate"&&<button onClick={()=>setEditor({kind:"invoice",source:d})}>Create invoice</button>}</div></td></tr>)}</tbody></table>{!records.length&&<Empty title={"No "+view+" yet"} text={"Create an "+kind+" from a project."}/>}</div></div>}</>}
      </div>}
    </section>
    {editor&&<RecordEditor editor={editor} data={data} onSaved={saved} onClose={()=>setEditor(null)}/>}
    {preview&&<DocumentPreview document={preview.record} kind={preview.kind} project={projects.get(preview.record.projectId)!} clientName={clientName(projects.get(preview.record.projectId)?.clientId||"")} onClose={()=>setPreview(null)} onShare={share} busy={!!busy}/>}
  </main>;
}
function Status({value}:{value:string}){return <span className={"admin-status status-"+value}>{pretty(value)}</span>;}
function Empty({title,text}:{title:string;text:string}){return <div className="office-empty"><h2>{title}</h2><p>{text}</p></div>;}
function Metric({label,value,onClick}:{label:string;value:string;onClick:()=>void}){return <button className="office-metric" onClick={onClick}><span>{label}</span><strong>{value}</strong></button>;}
function DocumentPreview({document,kind,project,clientName,onClose,onShare,busy}:{document:DocumentRecord;kind:DocumentKind;project:Project;clientName:string;onClose:()=>void;onShare:(p:Project,enabled:boolean)=>Promise<void>;busy:boolean}){
  const dialog=useRef<HTMLDialogElement>(null),[printing,setPrinting]=useState(false);
  useEffect(()=>{dialog.current?.showModal();return()=>{window.document.body.classList.remove("printing-document");};},[]);
  const url=project.shareToken?publicOrigin+"/projects/"+project.shareToken:undefined;
  async function print(){
    setPrinting(true);
    const imgs=Array.from(dialog.current?.querySelectorAll("img")||[]);
    await Promise.all(imgs.map(img=>img.complete?Promise.resolve():img.decode().catch(()=>{})));
    window.document.body.classList.add("printing-document");window.print();window.document.body.classList.remove("printing-document");setPrinting(false);
  }
  return <dialog ref={dialog} className="document-dialog" onCancel={e=>{e.preventDefault();onClose();}}><div className="document-controls"><button onClick={onClose}>← Close preview</button><div>{url&&!["draft","void"].includes(document.status)?<a href={url+"#"+document.id} target="_blank" rel="noreferrer">Open digital document ↗</a>:<span>{!url?"Enable the project link to include it on this document.":"Draft and void documents are visible only in the Field Office."}</span>}{!url&&<button disabled={busy} onClick={()=>void onShare(project,true)}>Enable customer link</button>}<button className="admin-save" onClick={()=>void print()} disabled={printing}>{printing?"Preparing…":"Print / save PDF"}</button></div></div>
    <CustomerDocument document={{...document,kind,dueDate:document.dueDate||document.validUntil||null}} project={{name:project.name,map:parseMap(project),url}} clientName={clientName}/>
  </dialog>;
}
