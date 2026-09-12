import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import worker from "../dist/server/index.js";

class LocalD1 {
  constructor(){this.sqlite=new DatabaseSync(":memory:");this.sqlite.exec("PRAGMA foreign_keys=ON");this.beforeBatch=null;}
  prepare(sql){
    const sqlite=this.sqlite;let args=[];
    return {
      bind(...values){args=values;return this;},
      execute(){const stmt=sqlite.prepare(sql);const result=stmt.all(...args);return {results:result,success:true,meta:{changes:Number(sqlite.prepare("SELECT changes() n").get().n)}};},
      async all(){return this.execute();},
      async run(){return this.execute();},
      async first(column){const row=this.execute().results[0];return column?row?.[column]??null:row??null;},
      async raw(){const stmt=sqlite.prepare(sql);stmt.setReturnArrays(true);return stmt.all(...args);},
    };
  }
  async batch(statements){
    this.beforeBatch?.();this.beforeBatch=null;
    this.sqlite.exec("BEGIN");
    try{const results=statements.map(s=>s.execute());this.sqlite.exec("COMMIT");return results;}
    catch(error){this.sqlite.exec("ROLLBACK");throw error;}
  }
}
const ctx={waitUntil(){},passThroughOnException(){}};
function setup(t){
  const DB=new LocalD1();
  for(const name of readdirSync(new URL("../drizzle/",import.meta.url)).filter(n=>n.endsWith(".sql")).sort())DB.sqlite.exec(readFileSync(new URL("../drizzle/"+name,import.meta.url),"utf8"));
  t.after(()=>DB.sqlite.close());
  const files=new Map();
  const env={DB,PROJECT_FILES:{put:async(key,value)=>{files.set(key,value);},get:async key=>files.has(key)?{body:files.get(key)}:null},ASSETS:{fetch:async()=>new Response("Not found",{status:404})}};
  const request=async(path,method="GET",body,host="http://localhost",headers={})=>worker.fetch(new Request(host+path,{method,headers:{"content-type":"application/json",...headers},...(body?{body:JSON.stringify(body)}:{})}),env,ctx);
  async function write(path,method,body,status=201){const response=await request(path,method,body);const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));return result;}
  return {DB,request,write};
}
const client=()=>({id:randomUUID(),firstName:"Test",lastName:"Gardener",organization:"",email:"customer@example.com",phone:"3095550100",address:"",city:"Peoria",state:"IL",postalCode:"",notes:"INTERNAL_CLIENT_SECRET"});
const project=clientId=>({id:randomUUID(),clientId,name:"Prairie plan",serviceType:"native-landscape",status:"lead",siteAddress:"PRIVATE_ADDRESS_SECRET",description:"INTERNAL_FIELD_SECRET",publicSummary:"Native habitat planting",targetStartDate:"2026-10-01"});
const doc=projectId=>({id:randomUUID(),kind:"estimate",projectId,status:"sent",issueDate:"2026-09-10",dueDate:"2026-10-10",markupPercent:30,notes:"Customer payment terms",items:[{description:"Site preparation",quantity:2,unitCost:"125.50"},{description:"Native plants",quantity:"3.125",unitCost:"40.00"}]});

test("location details and private area notes persist; estimate maps are safe independent snapshots",async t=>{
  const {write,request,DB}=setup(t),c=client(),p=project(c.id),d=doc(p.id);
  await write("/api/admin/clients","POST",c);await write("/api/admin/projects","POST",p);
  DB.sqlite.prepare("UPDATE projects SET target_start_date='2026-10-01' WHERE id=?").run(p.id);
  await write("/api/admin/projects","PATCH",{...p,revision:0},200);
  assert.equal(DB.sqlite.prepare("SELECT target_start_date FROM projects WHERE id=?").get(p.id).target_start_date,"2026-10-01");
  const map={center:[40.69,-89.59],zoom:18,features:[{id:randomUUID(),kind:"area",title:"Prairie one",color:"#cc8844",points:[[40.69,-89.59],[40.691,-89.59],[40.691,-89.589]],plants:"PRIVATE_SEED_RESEARCH",notes:"PRIVATE_AREA_NOTES"}]};
  const details={clientId:c.id,name:"Updated location",serviceType:"consultation",siteAddress:"Bushnell",description:"PRIVATE_SITE_NOTES"};
  const saved=await write("/api/admin/project-map","PATCH",{id:p.id,revision:1,map,details},200);
  assert.equal(saved.project.name,"Updated location");assert.match(saved.project.mapJson,/PRIVATE_AREA_NOTES/);
  await write("/api/admin/project-map","PATCH",{id:p.id,revision:1,map:null},409);
  await write("/api/admin/documents","POST",{...d,planAction:"attach"});
  const snapshot=DB.sqlite.prepare("SELECT plan_json FROM estimates WHERE id=?").get(d.id).plan_json;
  assert.match(snapshot,/Prairie one/);assert.doesNotMatch(snapshot,/PRIVATE_/);
  await write("/api/admin/project-map","PATCH",{id:p.id,revision:2,map:null},200);
  assert.equal(DB.sqlite.prepare("SELECT map_json FROM projects WHERE id=?").get(p.id).map_json,null);
  assert.equal(DB.sqlite.prepare("SELECT plan_json FROM estimates WHERE id=?").get(d.id).plan_json,snapshot);
  await write("/api/admin/documents","PATCH",{...d,revision:0,planAction:"keep"},200);
  assert.equal(DB.sqlite.prepare("SELECT plan_json FROM estimates WHERE id=?").get(d.id).plan_json,snapshot);
  DB.beforeBatch=()=>DB.sqlite.prepare("UPDATE estimates SET revision=revision+1 WHERE id=?").run(d.id);
  await write("/api/admin/documents","PATCH",{...d,revision:1,planAction:"remove"},409);
  assert.equal(DB.sqlite.prepare("SELECT plan_json FROM estimates WHERE id=?").get(d.id).plan_json,snapshot);
  const shared=await write("/api/admin/project-map","PATCH",{id:p.id,revision:3,map,sharing:true},200);
  const html=await (await request("/projects/"+shared.project.shareToken)).text();
  assert.doesNotMatch(html,/PRIVATE_AREA_NOTES|PRIVATE_SEED_RESEARCH|PRIVATE_SITE_NOTES/);
  await write("/api/admin/documents","PATCH",{...d,revision:2,planAction:"remove"},200);
  assert.equal(DB.sqlite.prepare("SELECT plan_json FROM estimates WHERE id=?").get(d.id).plan_json,null);
});

test("project items persist, archive safely, protect media and reject foreign map placements",async t=>{
  const {write,request,DB}=setup(t),c=client(),p=project(c.id),p2=project(c.id);
  await write("/api/admin/clients","POST",c);await write("/api/admin/projects","POST",p);await write("/api/admin/projects","POST",p2);
  const item={id:randomUUID(),projectId:p.id,name:"Native seed mix",category:"seed-mix",quantity:"2.5",unit:"lb",unitCost:"24.50",billable:true,archived:false,notes:"INTERNAL_ITEM_SECRET",sourceUrl:"https://supplier.example/private"};
  await write("/api/admin/project-items","POST",item);await write("/api/admin/project-items","POST",item,200);
  await write("/api/admin/project-items","PATCH",{...item,revision:0,quantity:3},200);
  await write("/api/admin/project-items","PATCH",{...item,revision:0,name:"Stale"},409);
  const overview=await (await request("/api/admin/overview")).json();assert.equal(overview.projectItems.length,1);assert.equal(overview.projectItems[0].quantityMilli,3000);
  const map={center:[40.69,-89.59],zoom:18,frame:{provider:"usda-naip",bounds:[-9973100,4966000,-9972500,4966500]},features:[{id:randomUUID(),kind:"symbol",title:"Native seed mix",color:"#cc8844",symbol:"prairie",points:[[40.69,-89.59]],projectItemId:item.id}]};
  await write("/api/admin/project-map","PATCH",{id:p2.id,revision:0,map},400);
  await write("/api/admin/project-map","PATCH",{id:p.id,revision:0,map},200);
  const d={...doc(p.id),items:[{description:item.name,quantity:3,unitCost:item.unitCost}]};await write("/api/admin/documents","POST",d);
  await write("/api/admin/project-items","PATCH",{...item,revision:1,unitCost:999,archived:true},200);
  assert.equal(DB.sqlite.prepare("SELECT unit_cost_cents FROM estimate_items WHERE estimate_id=?").get(d.id).unit_cost_cents,2450);
  assert.match(DB.sqlite.prepare("SELECT map_json FROM projects WHERE id=?").get(p.id).map_json,/Native seed mix/);
  const shared=await write("/api/admin/project-map","PATCH",{id:p.id,revision:1,sharing:true},200);
  const html=await (await request("/projects/"+shared.project.shareToken)).text();assert.doesNotMatch(html,/INTERNAL_ITEM_SECRET|supplier\.example|imageKey|unitCostCents/);
  assert.equal((await request("/api/admin/project-items?image="+item.id,"GET",undefined,"https://www.perfectprairie.com")).status,404);
  await write("/api/admin/project-items","PATCH",{...item,revision:2,imageData:"data:image/svg+xml;base64,PHN2Zz4="},400);
});

test("create/edit clients, projects and itemized documents; server computes markup and keeps document numbers",async t=>{
  const {write,request,DB}=setup(t),c=client(),p=project(c.id),d=doc(p.id);
  await write("/api/admin/clients","POST",c);
  await write("/api/admin/clients","POST",c,200); // retry cannot duplicate
  await write("/api/admin/clients","PATCH",{...c,revision:0,firstName:"Updated"},200);
  await write("/api/admin/projects","POST",p);
  await write("/api/admin/projects","PATCH",{...p,revision:0,status:"on-hold"},200);
  await write("/api/admin/documents","POST",d);
  let overview=await (await request("/api/admin/overview")).json();
  assert.equal(overview.clients.length,1);assert.equal(overview.clients[0].firstName,"Updated");
  assert.equal(overview.projects[0].status,"on-hold");
  const before=overview.estimates[0];assert.equal(before.items.length,2);assert.equal(before.markupBps,3000);
  assert.equal(before.items[0].unitCostCents,12550);assert.equal(before.items[0].unitPriceCents,16315);
  assert.equal(before.totalCents,48880); // 2 x 163.15 + 3.125 x 52
  const updated={...d,revision:0,markupPercent:20,status:"accepted",items:[{description:"Revised planting",quantity:"1.5",unitCost:"10.01"}]};
  await write("/api/admin/documents","PATCH",updated,200);
  overview=await (await request("/api/admin/overview")).json();
  assert.equal(overview.estimates[0].number,before.number);assert.equal(overview.estimates[0].items.length,1);
  assert.equal(overview.estimates[0].totalCents,1802);assert.equal(overview.estimates[0].revision,1);
  await write("/api/admin/documents","PATCH",{...updated,status:"declined"},409);
  DB.beforeBatch=()=>DB.sqlite.prepare("UPDATE estimates SET revision=revision+1 WHERE id=?").run(d.id);
  await write("/api/admin/documents","PATCH",{...updated,revision:1,items:[{description:"Should never replace",quantity:1,unitCost:50}]},409);
  assert.equal(DB.sqlite.prepare("SELECT description FROM estimate_items WHERE estimate_id=?").get(d.id).description,"Revised planting");
  const invoice={...d,id:randomUUID(),kind:"invoice",status:"paid",paidAt:"2026-09-12"};
  await write("/api/admin/documents","POST",invoice);
  await write("/api/admin/documents","PATCH",{...invoice,revision:0,status:"sent"},200);
  assert.equal(DB.sqlite.prepare("SELECT paid_at FROM invoices WHERE id=?").get(invoice.id).paid_at,null);
});

test("invalid data is rejected without losing existing line items",async t=>{
  const {write,request}=setup(t),c=client(),p=project(c.id),d=doc(p.id);
  await write("/api/admin/clients","POST",c);await write("/api/admin/projects","POST",p);await write("/api/admin/documents","POST",d);
  for(const items of [[],[{description:"",quantity:1,unitCost:5}],[{description:"Invalid",quantity:-1,unitCost:5}],[{description:"Invalid",quantity:1,unitCost:"NaN"}],Array.from({length:51},()=>d.items[0])]){
    await write("/api/admin/documents","PATCH",{...d,revision:0,items},400);
  }
  await write("/api/admin/documents","PATCH",{...d,revision:0,markupPercent:501},400);
  await write("/api/admin/projects","PATCH",{...p,revision:0,status:"fake"},400);
  await write("/api/admin/clients","PATCH",{...c,revision:0,email:"bad"},400);
  const state=await (await request("/api/admin/overview")).json();assert.equal(state.estimates[0].items.length,2);assert.equal(state.estimates[0].revision,0);
});

test("maps persist; public links omit internal data and drafts, and revoke immediately",async t=>{
  const {write,request}=setup(t),c=client(),p=project(c.id),d=doc(p.id);
  await write("/api/admin/clients","POST",c);await write("/api/admin/projects","POST",p);await write("/api/admin/documents","POST",d);
  await write("/api/admin/documents","POST",{...doc(p.id),notes:"DRAFT_DOCUMENT_SECRET",status:"draft"});
  const map={center:[40.6936,-89.589],zoom:18,features:[{id:randomUUID(),kind:"area",title:"Native prairie",color:"#b07739",points:[[40.6936,-89.589],[40.694,-89.589],[40.694,-89.5885]]},{id:randomUUID(),kind:"text",title:"Keep path clear",color:"#713521",points:[[40.6938,-89.5888]]}]};
  await write("/api/admin/project-map","PATCH",{id:p.id,revision:0,map},200);
  await write("/api/admin/project-map","PATCH",{id:p.id,revision:0,map},409);
  const shared=await write("/api/admin/project-map","PATCH",{id:p.id,revision:1,sharing:true},200);
  const token=shared.project.shareToken;assert.match(token,/^[a-f0-9]{48}$/);
  const response=await request("/projects/"+token,"GET",undefined,"https://www.perfectprairie.com",{accept:"text/html"});
  assert.equal(response.status,200);assert.match(response.headers.get("cache-control"),/no-store/);assert.equal(response.headers.get("referrer-policy"),"no-referrer");
  const html=await response.text();assert.match(html,/Native prairie/);assert.match(html,/Site preparation/);
  assert.doesNotMatch(html,/INTERNAL_CLIENT_SECRET|INTERNAL_FIELD_SECRET|PRIVATE_ADDRESS_SECRET|DRAFT_DOCUMENT_SECRET|unitCostCents|markupBps|googletagmanager/);
  await write("/api/admin/project-map","PATCH",{id:p.id,revision:2,sharing:false},200);
  assert.equal((await request("/projects/"+token,"GET",undefined,"https://www.perfectprairie.com")).status,404);
  assert.equal((await request("/projects/not-a-valid-token")).status,404);
});

test("admin APIs reject public-host, forged session and cross-origin requests",async t=>{
  const {request}=setup(t);
  assert.equal((await request("/api/admin/overview","GET",undefined,"https://www.perfectprairie.com")).status,404);
  assert.equal((await request("/api/admin/clients","POST",client(),"http://localhost",{origin:"https://evil.example"})).status,403);
  assert.equal((await request("/api/admin/overview","GET",undefined,"https://admin.perfectprairie.com",{"cf-access-jwt-assertion":"forged"})).status,403);
});

test("the additive migration preserves legacy amounts with zero markup",()=>{
  const db=new DatabaseSync(":memory:");
  try{
    db.exec(readFileSync(new URL("../drizzle/0000_lethal_lifeguard.sql",import.meta.url),"utf8"));
    db.exec("INSERT INTO clients (id,first_name,last_name) VALUES ('c','Legacy','Client'); INSERT INTO projects (id,client_id,name,service_type) VALUES ('p','c','Legacy project','consultation')");
    db.exec("INSERT INTO estimates (id,project_id,number,status,issue_date,subtotal_cents,total_cents) VALUES ('e','p','old','sent','2026-09-01',999,999); INSERT INTO estimate_items (id,estimate_id,description,quantity_milli,unit_price_cents,position) VALUES ('i','e','Legacy',1000,999,0)");
    db.exec(readFileSync(new URL("../drizzle/0001_eager_lord_tyger.sql",import.meta.url),"utf8"));
    const row=db.prepare("SELECT total_cents,markup_bps FROM estimates").get();assert.equal(row.total_cents,999);assert.equal(row.markup_bps,0);
    assert.equal(db.prepare("SELECT unit_cost_cents FROM estimate_items").get().unit_cost_cents,null);
  }finally{db.close();}
});
