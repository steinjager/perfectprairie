import test from "node:test";
import assert from "node:assert/strict";
import { areaSqMeters, calculateItems, validateMap } from "../lib/operations.ts";
test("geodesic area matches a known equatorial square and is winding-independent",()=>{
  const square=[[0,0],[0,.001],[.001,.001],[.001,0]];
  assert.ok(Math.abs(areaSqMeters(square)-12364.35)<1);
  assert.ok(Math.abs(areaSqMeters([...square].reverse())-areaSqMeters(square))<.001);
});
test("pricing rounds customer unit rate then line total consistently",()=>{
  const result=calculateItems([{description:"Plants",quantity:1.5,unitCost:10.01}],20);
  assert.equal(result.items[0].unitPriceCents,1201);assert.equal(result.totalCents,1802);
  assert.throws(()=>calculateItems([{description:"Plants",quantity:.0001,unitCost:10}],30));
});
test("invalid map payloads cannot store bad coordinates or duplicate features",()=>{
  assert.throws(()=>validateMap({center:[Infinity,0],zoom:18,features:[]}));
  assert.throws(()=>validateMap({center:[0,0],zoom:18,features:[{id:crypto.randomUUID(),kind:"area",title:"Area",color:"#abcdef",points:[[0,0],[0,0],[0,0]]}]}));
  assert.throws(()=>validateMap({center:[0,0],zoom:18,features:[{id:crypto.randomUUID(),kind:"area",title:"Crossed edges",color:"#abcdef",points:[[0,0],[.003,.002],[0,.002],[.002,0]]}]}),/edges must not cross/);
});
