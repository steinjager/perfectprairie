import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const importTs = async path => {
  const js = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
};
const operations = await importTs("../lib/operations.ts");
let source = ts.transpileModule(readFileSync(new URL("../lib/project-items.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const opsJs=ts.transpileModule(readFileSync(new URL("../lib/operations.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
source=source.replace('"./operations"',JSON.stringify("data:text/javascript;base64,"+Buffer.from(opsJs).toString("base64")));
const { validateProjectItem, projectItemLines, validatePhoto } = await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));

test("photo validation rejects fake JPEG headers and excessive dimensions",()=>{
  assert.throws(()=>validatePhoto(new Uint8Array([255,216,255,217])));
  const bytes=new Uint8Array(40);bytes.set([255,216,255,192,0,17,8,0,10,0,10]);bytes.set([255,217],38);validatePhoto(bytes);
  bytes[9]=127;assert.throws(()=>validatePhoto(bytes));
});

test("project item validation and customer-safe independent document snapshots",()=>{
  const input={name:"Native seed mix",category:"seed-mix",quantity:"2.5",unit:"lb",unitCost:"24.50",billable:true,archived:false,notes:"PRIVATE RESEARCH",sourceUrl:"https://supplier.example/seed"};
  const parsed=validateProjectItem(input);
  assert.equal(parsed.quantityMilli,2500);assert.equal(parsed.unitCostCents,2450);
  const lines=projectItemLines([{...parsed,id:crypto.randomUUID(),projectId:crypto.randomUUID(),revision:0,imageKey:"PRIVATE PHOTO"}]);
  assert.equal(lines[0].description,"Native seed mix (lb)");assert.equal(lines[0].unitCost,"24.50");
  assert.doesNotMatch(JSON.stringify(lines),/PRIVATE|supplier/);
  parsed.unitCostCents=9999;assert.equal(lines[0].unitCost,"24.50");
  assert.equal(projectItemLines([{...parsed,billable:false},{...parsed,archived:true}]).length,0);
  for(const sourceUrl of ["javascript:alert(1)","data:text/html,evil","https://user:secret@example.com","incomplete"]){assert.throws(()=>validateProjectItem({...input,sourceUrl}));}
  assert.throws(()=>validateProjectItem({...input,quantity:""}));assert.throws(()=>validateProjectItem({...input,billable:"true"}));
});

test("locked map metadata and project placement IDs are validated and retained",()=>{
  const frame={provider:"usda-naip",bounds:[-9973100,4966000,-9972500,4966500]};
  const map={center:[40.69,-89.58],zoom:18,frame,features:[{id:crypto.randomUUID(),kind:"symbol",title:"Native seed mix",color:"#cc8844",symbol:"prairie",points:[[40.69,-89.58]],projectItemId:crypto.randomUUID()}]};
  assert.deepEqual(operations.validateMap(map),map);
  for(const bounds of [[0,0,0,10],[20,10,5,30],[0,0,Infinity,20]])assert.throws(()=>operations.validateMap({...map,frame:{...frame,bounds}}));
  assert.throws(()=>operations.validateMap({...map,frame:{...frame,provider:"arbitrary remote URL"}}));
});
