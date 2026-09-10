"use client";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { areaLabel, symbols, validateMap, type MapFeature, type Position, type ProjectMap } from "@/lib/operations";
import { defaultCenter } from "@/lib/map";
import { imageryLayer } from "@/lib/imagery-layer";

type Tool = "select" | "area" | "text" | "symbol";
export default function MapWorkspace({ initial, onSave, onClose }: { initial: ProjectMap | null; onSave: (map: ProjectMap) => Promise<void>; onClose: () => void }) {
  const [plan, setPlan] = useState<ProjectMap>(initial || { center: defaultCenter, zoom: 16, features: [] });
  const [selected, setSelected] = useState(""), [tool, setTool] = useState<Tool>("select");
  const [draft, setDraft] = useState<Position[]>([]), [symbol, setSymbol] = useState("prairie");
  const [notice, setNotice] = useState(""), [saving, setSaving] = useState(false), [ready, setReady] = useState(false);
  const [history, setHistory] = useState<ProjectMap[]>([]), [coords, setCoords] = useState("");
  const container = useRef<HTMLDivElement>(null), mapRef = useRef<Leaflet.Map | null>(null), layers = useRef<Leaflet.LayerGroup | null>(null), L = useRef<typeof Leaflet | null>(null);
  const dirty = useRef(false), touched = useRef(false), state = useRef({ plan, tool, draft, symbol });
  useEffect(() => { state.current = { plan, tool, draft, symbol }; }, [plan,tool,draft,symbol]);
  function change(next: ProjectMap) { dirty.current=true; setHistory(h=>[...h.slice(-39),state.current.plan]); setPlan(next); }
  function editFeature(key: string, update: Partial<MapFeature>) { change({ ...state.current.plan, features: state.current.plan.features.map(f=>f.id===key ? {...f,...update} : f) }); }
  function locate() {
    if (!navigator.geolocation) { setNotice("Location is unavailable. Pan the map or enter coordinates."); return; }
    setNotice("Finding your location…");
    navigator.geolocation.getCurrentPosition(p=>{ mapRef.current?.setView([p.coords.latitude,p.coords.longitude],18); setNotice(`Device accuracy: about ${Math.round(p.coords.accuracy)} metres. Adjust the map as needed.`); },()=>setNotice("Location access was unavailable. Pan the map, use Project location, or enter latitude, longitude."),{enableHighAccuracy:true,timeout:12000,maximumAge:30000});
  }
  useEffect(() => {
    let disposed=false;
    void import("leaflet").then(leaflet=>{
      if(disposed || !container.current) return;
      L.current=leaflet;
      const map=leaflet.map(container.current,{maxZoom:22,minZoom:2,doubleClickZoom:false}).setView(state.current.plan.center,state.current.plan.zoom);
      mapRef.current=map;
      imageryLayer(leaflet).addTo(map).on("tileerror",()=>setNotice("Some aerial imagery is unavailable. Your plan is still editable; try zooming out."));
      layers.current=leaflet.layerGroup().addTo(map);
      leaflet.control.scale({imperial:true,metric:false}).addTo(map);
      map.on("dragstart zoomstart",()=>{touched.current=true;});
      map.on("click",e=>{
        const current=state.current, position: Position=[e.latlng.lat,e.latlng.lng];
        if(current.tool==="area") { setDraft(d=>[...d,position]); return; }
        if(current.tool==="text" || current.tool==="symbol") {
          const f: MapFeature={id:crypto.randomUUID(),kind:current.tool,title:current.tool==="text"?"Plan note":current.symbol,color:"#e8b447",points:[position],...(current.tool==="symbol"?{symbol:current.symbol}:{})};
          change({...current.plan,features:[...current.plan.features,f]}); setSelected(f.id); setTool("select");
        } else setSelected("");
      });
      setReady(true);
      if (navigator.geolocation) {
        setNotice("Finding your location…");
        navigator.geolocation.getCurrentPosition(p=>{
          if(disposed) return;
          if(!touched.current) map.setView([p.coords.latitude,p.coords.longitude],18);
          setNotice(`Device accuracy: about ${Math.round(p.coords.accuracy)} metres. Project location returns to the saved plan.`);
        },()=>{if(!disposed)setNotice("Location permission is unavailable. Pan the map or enter coordinates to find the site.");},{enableHighAccuracy:true,timeout:12000,maximumAge:30000});
      }
    }).catch(()=>setNotice("The map could not load. Close and reopen it to retry."));
    return ()=>{disposed=true; mapRef.current?.remove(); mapRef.current=null;};
    // The map instance is created once; event handlers read current draft state through refs.
  }, []);
  useEffect(()=>{
    const leaflet=L.current, group=layers.current;
    if(!leaflet || !group) return;
    group.clearLayers();
    for(const f of plan.features) {
      if(f.kind==="area") {
        const polygon=leaflet.polygon(f.points,{color:f.color,fillOpacity:.3,weight:f.id===selected?4:2}).addTo(group);
        const label=document.createElement("span"); label.textContent=f.title+" · "+areaLabel(f.points);
        polygon.bindTooltip(label,{sticky:true});
        polygon.on("click",e=>{if(state.current.tool!=="select")return;leaflet.DomEvent.stopPropagation(e);setSelected(f.id);});
        if(f.id===selected) f.points.forEach((p,i)=>{
          const vertex=leaflet.marker(p,{draggable:true,icon:leaflet.divIcon({className:"map-vertex",iconSize:[14,14]})}).addTo(group);
          vertex.on("dragend",()=>{const ll=vertex.getLatLng();const pts=[...f.points];pts[i]=[ll.lat,ll.lng];editFeature(f.id,{points:pts});});
          vertex.on("contextmenu",e=>{leaflet.DomEvent.preventDefault(e.originalEvent);if(f.points.length>3)editFeature(f.id,{points:f.points.filter((_,j)=>j!==i)});});
          const next=f.points[(i+1)%f.points.length];
          const midpoint=leaflet.marker([(p[0]+next[0])/2,(p[1]+next[1])/2],{icon:leaflet.divIcon({className:"map-midpoint",iconSize:[10,10]})}).addTo(group);
          midpoint.on("click",e=>{leaflet.DomEvent.stopPropagation(e);const pts=[...f.points];pts.splice(i+1,0,[(p[0]+next[0])/2,(p[1]+next[1])/2]);editFeature(f.id,{points:pts});});
        });
      } else {
        const label=document.createElement("span");label.className="map-label";label.style.borderColor=f.color;label.textContent=(f.kind==="symbol" ? (symbols[f.symbol||"prairie"]+" ") : "")+f.title;
        const marker=leaflet.marker(f.points[0],{draggable:true,icon:leaflet.divIcon({className:"map-label-wrap"+(selected===f.id?" selected":""),html:label,iconSize:undefined,iconAnchor:[0,16]})}).addTo(group);
        marker.on("click",e=>{leaflet.DomEvent.stopPropagation(e);setSelected(f.id);setTool("select");});
        marker.on("dragend",()=>{const ll=marker.getLatLng();editFeature(f.id,{points:[[ll.lat,ll.lng]]});});
      }
    }
    if(draft.length) {
      leaflet.polyline(draft,{color:"#ffffff",dashArray:"7 5",weight:3}).addTo(group);
      draft.forEach(p=>leaflet.circleMarker(p,{radius:5,color:"#fff"}).addTo(group));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[plan,selected,draft,ready]);
  useEffect(()=>{
    const before=(e: BeforeUnloadEvent)=>{if(dirty.current||state.current.draft.length)e.preventDefault();};
    window.addEventListener("beforeunload",before);return()=>window.removeEventListener("beforeunload",before);
  },[]);
  function finishArea() {
    if(draft.length<3)return;
    const f:MapFeature={id:crypto.randomUUID(),kind:"area",title:"Planting area "+(plan.features.filter(f=>f.kind==="area").length+1),color:"#e8b447",points:draft};
    change({...plan,features:[...plan.features,f]});setDraft([]);setSelected(f.id);setTool("select");
  }
  async function save() {
    if(draft.length){setNotice("Finish or cancel the area before saving.");return;}
    setSaving(true);
    try {const map=mapRef.current;if(!map)throw new Error("Wait for the map to load.");const c=map.getCenter(); const next=validateMap({...plan,center:[c.lat,c.lng],zoom:map.getZoom()});if(next)await onSave(next);dirty.current=false;}
    catch(e){setNotice(e instanceof Error?e.message:"Could not save. Your edits are still here.");}
    finally{setSaving(false);}
  }
  const feature=plan.features.find(f=>f.id===selected);
  return <section className="map-workspace" aria-label="Project map editor">
    <div className="map-toolbar"><button onClick={()=>{if(!dirty.current&&!draft.length||confirm("Discard unsaved map changes?"))onClose();}} disabled={saving}>← Back to projects</button><strong>Planting plan</strong><button className="admin-save" onClick={()=>void save()} disabled={saving||!ready}>{saving?"Saving…":"Save map & close"}</button></div>
    <div className="map-editor-grid"><aside className="map-tools">
      <h2>Shape the plan</h2><div className="map-tool-buttons">{(["select","area","symbol","text"] as Tool[]).map(t=><button key={t} className={tool===t?"active":""} onClick={()=>{if(t===tool)return;if(draft.length&&!confirm("Discard the unfinished area?"))return;setTool(t);setDraft([]);}}>{({select:"Move / select",area:"Draw area",symbol:"Place symbol",text:"Add text"})[t]}</button>)}</div>
      <p className="field-hint">{tool==="area"?"Click each corner, then finish the area.":tool==="text"?"Click the map to add text, then drag it into place.":tool==="symbol"?"Choose a symbol and click the map.":"Drag the map to move. Select a shape to edit its corners and details."}</p>
      {tool==="symbol"&&<label>Symbol<select value={symbol} onChange={e=>setSymbol(e.target.value)}>{Object.entries(symbols).map(([key,icon])=><option value={key} key={key}>{icon} {key}</option>)}</select></label>}
      {draft.length>0&&<div className="map-draft"><span>{draft.length} corners</span><button disabled={draft.length<3} onClick={finishArea}>Finish area</button><button onClick={()=>setDraft(d=>d.slice(0,-1))}>Undo corner</button><button onClick={()=>setDraft([])}>Cancel area</button></div>}
      {feature&&<div className="map-feature-editor"><label>Title / text<input maxLength={120} value={feature.title} onChange={e=>editFeature(feature.id,{title:e.target.value})}/></label><label>Color<input type="color" value={feature.color} onChange={e=>editFeature(feature.id,{color:e.target.value})}/></label>{feature.kind==="area"&&<><strong>{areaLabel(feature.points)}</strong><p className="field-hint">Drag corners to reshape. Tap a small midpoint to add a corner. Right-click a corner to remove it.</p></>}<button className="danger" onClick={()=>{change({...plan,features:plan.features.filter(f=>f.id!==selected)});setSelected("");}}>Remove selected</button></div>}
      <button disabled={!history.length} onClick={()=>{setPlan(history.at(-1)!);setHistory(h=>h.slice(0,-1));dirty.current=true;}}>Undo last change</button>
      <hr/><div className="map-locate"><button onClick={locate}>◎ My location</button><button onClick={()=>mapRef.current?.setView(initial?.center||plan.center,initial?.zoom||plan.zoom)}>Project location</button></div>
      <form onSubmit={e=>{e.preventDefault();const p=coords.split(",").map(Number);if(p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<85&&Math.abs(p[1])<=180)mapRef.current?.setView(p as Position,18);else setNotice("Enter latitude, longitude (for example 40.69, -89.59).");}}><label>Go to coordinates<input value={coords} onChange={e=>setCoords(e.target.value)} placeholder="40.69, -89.59"/></label><button>Go</button></form>
      <p className="map-notice" role="status">{notice}</p>
      <h3>Plan features · {plan.features.length}</h3><div className="map-feature-list">{plan.features.map(f=><button className={selected===f.id?"active":""} key={f.id} onClick={()=>{setSelected(f.id);setTool("select");mapRef.current?.panTo(f.points[0]);}}>{f.kind==="area"?"▱":f.kind==="text"?"T":symbols[f.symbol||"prairie"]} {f.title}</button>)}</div>
      <p className="field-hint">Aerial imagery is historical. Measurements are estimates, not survey boundaries.</p>
    </aside><div className={"map-canvas tool-"+tool} ref={container}/></div>
  </section>;
}
