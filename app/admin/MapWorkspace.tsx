"use client";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type {} from "@geoman-io/leaflet-geoman-free";
import type { ProjectItem } from "@/lib/admin-types";
import { areaLabel, symbols, validateMap, type MapFeature, type Position, type ProjectMap } from "@/lib/operations";
import { defaultCenter, detailImageUrl, projectPoint } from "@/lib/map";
import { imageryLayer } from "@/lib/imagery-layer";

type Tool = "select" | "area" | "text" | `symbol:${string}` | `item:${string}`;
type Stage = "positioning" | "loading" | "locked";
type Layer = Leaflet.Polygon | Leaflet.Marker;
const layerPoints = (layer: Leaflet.Polyline | Leaflet.Polygon): Position[] => {
  const raw = layer.getLatLngs(), ring = Array.isArray(raw[0]) ? raw[0] : raw;
  return (ring as Leaflet.LatLng[]).map(p => [p.lat, p.lng]);
};
export default function MapWorkspace({ initial, projectName, items = [], onSave, onClose }: { initial: ProjectMap | null; projectName: string; items?: ProjectItem[]; onSave: (map: ProjectMap) => Promise<void>; onClose: () => void }) {
  const [plan, setPlan] = useState<ProjectMap>(initial || { center: defaultCenter, zoom: 17, features: [] });
  const [tool, setTool] = useState<Tool>("select"), [stage, setStage] = useState<Stage>("positioning");
  const [selected, setSelected] = useState(""), [moving, setMoving] = useState(false), [vertex, setVertex] = useState<number | null>(null);
  const [notice, setNotice] = useState("Position the site, then lock the map to begin planning."), [ready, setReady] = useState(false), [saving, setSaving] = useState(false);
  const [corners, setCorners] = useState(0), [progress, setProgress] = useState<number | null>(null), [coords, setCoords] = useState("");
  const [history, setHistory] = useState<MapFeature[][]>([]), [future, setFuture] = useState<MapFeature[][]>([]);
  const [panel, setPanel] = useState<"items" | "plan">("plan");
  const container = useRef<HTMLDivElement>(null), mapRef = useRef<Leaflet.Map | null>(null), api = useRef<typeof Leaflet | null>(null);
  const layerRefs = useRef(new Map<string, Layer>()), draft = useRef<Leaflet.Polyline | null>(null), overlay = useRef<Leaflet.ImageOverlay | null>(null);
  const imageUrl = useRef(""), controller = useRef<AbortController | null>(null), dirty = useRef(false), touched = useRef(false);
  const savingRef = useRef(false);
  const state = useRef({ plan, tool, stage, items, selected, moving });
  useEffect(() => { state.current = { plan, tool, stage, items, selected, moving }; }, [plan, tool, stage, items, selected, moving]);

  function change(next: ProjectMap, remember = true) {
    if (savingRef.current) return false;
    try { validateMap(next); } catch (e) { setNotice(e instanceof Error ? e.message : "Check the plan."); return false; }
    const previous = state.current.plan.features;
    if (remember) { setHistory(h => [...h.slice(-49), previous]); setFuture([]); }
    dirty.current = true; state.current.plan = next; setPlan(next); return true;
  }
  function edit(id: string, update: Partial<MapFeature>) {
    return change({ ...state.current.plan, features: state.current.plan.features.map(f => f.id === id ? { ...f, ...update } : f) });
  }
  function selectFeature(id: string) { if (state.current.selected !== id) setMoving(false); setSelected(id); setVertex(null); setPanel("plan"); }
  function choose(next: Tool, toggle = true) {
    if (state.current.stage !== "locked" || savingRef.current) return false;
    if (draft.current && layerPoints(draft.current).length && !confirm("Discard the unfinished area?")) return false;
    mapRef.current?.pm.disableDraw(); draft.current = null; setCorners(0);
    const value = toggle && state.current.tool === next ? "select" : next;
    state.current.tool = value; setTool(value); setMoving(false); setVertex(null);
    if (value !== "select") setSelected("");
    if (value === "area") mapRef.current?.pm.enableDraw("Polygon", { allowSelfIntersection: false, snappable: true, snapDistance: 16, finishOn: "dblclick", finishOnEnter: true, continueDrawing: false, pathOptions: { color: "#edb84b", fillOpacity: .25 }, templineStyle: { color: "#fff", weight: 3 } });
    return true;
  }
  function finishArea() {
    if (!draft.current) return;
    const points = layerPoints(draft.current);
    const f: MapFeature = { id: crypto.randomUUID(), kind: "area", title: "Planting area " + (state.current.plan.features.filter(f => f.kind === "area").length + 1), color: "#edb84b", points };
    if (!change({ ...state.current.plan, features: [...state.current.plan.features, f] })) return;
    mapRef.current?.pm.disableDraw(); draft.current = null; setCorners(0); setTool("select"); state.current.tool = "select"; selectFeature(f.id);
  }
  function place(position: Position) {
    const s = state.current;
    if (s.stage !== "locked" || s.tool === "area") return;
    if (s.tool === "select") { setSelected(""); return; }
    const item = s.tool.startsWith("item:") ? s.items.find(i => i.id === s.tool.slice(5) && !i.archived) : undefined;
    if (s.tool.startsWith("item:") && !item) return;
    const symbol = s.tool.startsWith("symbol:") ? s.tool.slice(7) : "prairie";
    const f: MapFeature = { id: crypto.randomUUID(), kind: s.tool === "text" ? "text" : "symbol", title: item ? item.name.slice(0, 120) : s.tool === "text" ? "Plan note" : symbol, color: "#f0bd57", points: [position], ...(s.tool !== "text" ? { symbol } : {}), ...(item ? { projectItemId: item.id } : {}) };
    if (change({ ...s.plan, features: [...s.plan.features, f] })) { setSelected(f.id); if (s.tool === "text") { setTool("select"); state.current.tool = "select"; selectFeature(f.id); } }
  }
  function locate() {
    if (state.current.stage !== "positioning") return;
    if (!navigator.geolocation) { setNotice("Device location is unavailable. Pan the map or enter coordinates."); return; }
    touched.current = false; setNotice("Finding your location…");
    navigator.geolocation.getCurrentPosition(p => {
      if (!mapRef.current || state.current.stage !== "positioning" || touched.current) return;
      mapRef.current.setView([p.coords.latitude, p.coords.longitude], 18);
      setNotice("Location accuracy: about " + Math.round(p.coords.accuracy) + " metres. Position the site before locking.");
    }, () => setNotice("Location unavailable. Pan/zoom or enter latitude, longitude."), { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }
  useEffect(() => {
    let disposed = false;
    void (async () => {
      const L = await import("leaflet"); await import("@geoman-io/leaflet-geoman-free");
      if (disposed || !container.current) return;
      api.current = L;
      const map = L.map(container.current, { minZoom: 3, maxZoom: 21, zoomSnap: 0, doubleClickZoom: false }).setView(state.current.plan.center, state.current.plan.zoom);
      mapRef.current = map; imageryLayer(L).addTo(map);
      L.control.scale({ imperial: true, metric: false }).addTo(map);
      map.pm.setGlobalOptions({ allowSelfIntersection: false, removeLayerBelowMinVertexCount: false, finishOnEnter: true });
      if (initial?.frame) {
        const b = initial.frame.bounds;
        map.fitBounds(L.latLngBounds(L.CRS.EPSG3857.unproject(L.point(b[0], b[1])), L.CRS.EPSG3857.unproject(L.point(b[2], b[3]))), { animate: false });
      }
      map.on("dragstart zoomstart", () => { touched.current = true; });
      map.on("click", e => { touched.current = true; place([e.latlng.lat, e.latlng.lng]); });
      map.on("pm:drawstart", e => {
        draft.current = e.workingLayer as Leaflet.Polyline;
        draft.current.on("pm:vertexadded pm:vertexremoved", () => setCorners(draft.current ? layerPoints(draft.current).length : 0));
        draft.current.on("pm:intersect", () => setNotice("That edge crosses another edge. Choose a different corner."));
      });
      map.on("pm:drawend", () => { draft.current = null; setCorners(0); });
      map.on("pm:create", e => {
        const polygon = e.layer as Leaflet.Polygon, points = layerPoints(polygon); polygon.remove();
        const f: MapFeature = { id: crypto.randomUUID(), kind: "area", title: "Planting area " + (state.current.plan.features.filter(f => f.kind === "area").length + 1), color: "#edb84b", points };
        if (change({ ...state.current.plan, features: [...state.current.plan.features, f] })) { selectFeature(f.id); setTool("select"); state.current.tool = "select"; setNotice("Area complete. Drag its corners, or choose Move whole shape."); }
      });
      setReady(true); if (!initial) locate();
    })().catch(() => setNotice("Map tools could not load. Close and reopen the studio to retry."));
    const before = (e: BeforeUnloadEvent) => { if (dirty.current || draft.current && layerPoints(draft.current).length) e.preventDefault(); };
    const keyboard = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select")) return;
      if (e.key === "Escape") { mapRef.current?.pm.disableDraw(); draft.current = null; setCorners(0); setTool("select"); state.current.tool = "select"; setSelected(""); }
    };
    window.addEventListener("beforeunload", before); window.addEventListener("keydown", keyboard);
    const layers = layerRefs.current;
    return () => { disposed = true; controller.current?.abort(); if (imageUrl.current) URL.revokeObjectURL(imageUrl.current); mapRef.current?.remove(); mapRef.current = null; layers.clear(); window.removeEventListener("beforeunload", before); window.removeEventListener("keydown", keyboard); };
    // One Leaflet instance; handlers read latest plan/tool refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const L = api.current, map = mapRef.current; if (!L || !map) return;
    for (const [id, layer] of layerRefs.current) if (!plan.features.some(f => f.id === id)) { layer.remove(); layerRefs.current.delete(id); }
    for (const f of plan.features) {
      let layer = layerRefs.current.get(f.id);
      if (!layer) {
        layer = f.kind === "area" ? L.polygon(f.points, { color: f.color, fillOpacity: .26 }) : L.marker(f.points[0], { draggable: false, pmIgnore: true });
        layerRefs.current.set(f.id, layer); layer.addTo(map); const target = layer;
        target.on("click", e => {
          if (state.current.stage !== "locked") return;
          if (state.current.tool === "select") { L.DomEvent.stopPropagation(e); selectFeature(f.id); }
          else if (target instanceof L.Marker) { L.DomEvent.stopPropagation(e); place([e.latlng.lat, e.latlng.lng]); }
        });
        if (target instanceof L.Polygon) {
          const sync = () => {
            const old = state.current.plan.features.find(feature => feature.id === f.id); if (!old) return;
            const points = layerPoints(target);
            if (JSON.stringify(points) !== JSON.stringify(old.points) && !edit(f.id, { points })) { target.setLatLngs(old.points); target.pm.disable(); target.pm.enable({ allowSelfIntersection: false, removeLayerBelowMinVertexCount: false }); }
          };
          // Geoman rolls intersecting edits back after markerdragend. Reconcile only
          // once its gesture has finished, never while it is rebuilding handles.
          target.on("pm:markerdragend pm:vertexadded pm:vertexremoved pm:dragend", () => queueMicrotask(sync));
          target.on("pm:vertexclick", e => { const path: unknown = e.indexPath; setVertex(Array.isArray(path) ? Number(path.at(-1)) : typeof path === "number" ? path : null); });
          target.on("pm:intersect", () => setNotice("Edges cannot cross. The last valid shape is retained."));
        } else target.on("dragend", () => { const p = target.getLatLng(); edit(f.id, { points: [[p.lat, p.lng]] }); });
      }
      const editable = stage === "locked" && tool === "select" && f.id === selected;
      if (layer instanceof L.Polygon) {
        const changed = JSON.stringify(layerPoints(layer)) !== JSON.stringify(f.points);
        if (changed) { layer.pm.disable(); layer.setLatLngs(f.points); }
        layer.setStyle({ color: f.color, weight: editable ? 4 : 2 });
        const label = document.createElement("span"); label.textContent = f.title + " · " + areaLabel(f.points); layer.unbindTooltip().bindTooltip(label, { sticky: true });
        if (editable && !moving) { layer.pm.disableLayerDrag(); if (!layer.pm.enabled()) layer.pm.enable({ allowSelfIntersection: false, removeLayerBelowMinVertexCount: false, snappable: false }); }
        else { if (layer.pm.enabled()) layer.pm.disable(); if (editable && moving) layer.pm.enableLayerDrag(); else layer.pm.disableLayerDrag(); }
      } else {
        const p = layer.getLatLng(); if (p.lat !== f.points[0][0] || p.lng !== f.points[0][1]) layer.setLatLng(f.points[0]);
        const label = document.createElement("span"); label.className = "map-label"; label.style.borderColor = f.color; label.textContent = (f.kind === "symbol" ? symbols[f.symbol || "prairie"] + " " : "") + f.title;
        layer.setIcon(L.divIcon({ className: "map-label-wrap" + (selected === f.id ? " selected" : ""), html: label, iconSize: undefined, iconAnchor: [0, 16] }));
        const element = layer.getElement();
        // Existing labels must not swallow clicks intended for drawing or placement.
        if (element) element.style.pointerEvents = tool === "select" ? "auto" : "none";
        if (stage === "locked" && tool === "select") layer.dragging?.enable(); else layer.dragging?.disable();
      }
    }
    // Stable layers retain pointer controllers across React updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, selected, moving, stage, tool, ready]);
  function navigation(enabled: boolean) {
    const map = mapRef.current; if (!map) return;
    for (const control of [map.dragging, map.scrollWheelZoom, map.touchZoom, map.boxZoom, map.keyboard]) { if (enabled) control.enable(); else control.disable(); }
    if (enabled) map.zoomControl?.addTo(map); else map.zoomControl?.remove();
  }
  function unlock() {
    if (draft.current && layerPoints(draft.current).length && !confirm("Discard the unfinished area and reposition the map?")) return;
    controller.current?.abort(); controller.current = null;
    mapRef.current?.pm.disableDraw(); setTool("select"); setSelected(""); setCorners(0); draft.current = null;
    state.current.stage = "positioning"; state.current.tool = "select"; setStage("positioning"); navigation(true);
    overlay.current?.remove(); overlay.current = null;
    if (imageUrl.current) URL.revokeObjectURL(imageUrl.current); imageUrl.current = "";
    setNotice("Map unlocked. Your completed plan is retained. Reposition and lock again to continue editing.");
  }
  async function lock() {
    const map = mapRef.current, L = api.current; if (!map || !L) return;
    touched.current = true; controller.current?.abort(); const request = new AbortController(); controller.current = request;
    navigation(false); state.current.stage = "loading"; setStage("loading"); setProgress(null); setNotice("Requesting detailed USDA aerial imagery…");
    const bounds = map.getBounds(), sw = projectPoint([bounds.getSouth(), bounds.getWest()]), ne = projectPoint([bounds.getNorth(), bounds.getEast()]);
    const extent: [number, number, number, number] = [sw[0], sw[1], ne[0], ne[1]];
    const timeout = setTimeout(() => request.abort(new Error("Imagery timed out. Try again or choose a smaller area.")), 45000); let objectUrl = "";
    try {
      const response = await fetch(detailImageUrl(extent), { signal: request.signal, credentials: "omit", referrerPolicy: "no-referrer" });
      if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error("Detailed imagery is unavailable for this view. Reposition or retry.");
      const total = Number(response.headers.get("content-length")), reader = response.body?.getReader(); if (!reader) throw new Error("Image download could not start.");
      const chunks: Uint8Array<ArrayBuffer>[] = []; let loaded = 0;
      for (;;) { const { done, value } = await reader.read(); if (done) break; loaded += value.byteLength; if (loaded > 24_000_000) { await reader.cancel(); throw new Error("Image too large. Zoom in and retry."); } chunks.push(new Uint8Array(value)); setProgress(total > 0 ? Math.min(95, Math.round(loaded / total * 95)) : null); setNotice("Downloading detailed aerial imagery…"); }
      objectUrl = URL.createObjectURL(new Blob(chunks, { type: "image/jpeg" })); const image = new Image(); image.src = objectUrl; setNotice("Decoding the full-detail image…"); await image.decode();
      if (request.signal.aborted || controller.current !== request) return;
      overlay.current?.remove(); if (imageUrl.current) URL.revokeObjectURL(imageUrl.current); imageUrl.current = objectUrl; objectUrl = "";
      overlay.current = L.imageOverlay(imageUrl.current, bounds, { opacity: 1, interactive: false, attribution: "USDA FPAC-BC · NAIP aerial imagery" }).addTo(map).bringToBack();
      const center = map.getCenter(); change({ ...state.current.plan, center: [center.lat, center.lng], zoom: map.getZoom(), frame: { provider: "usda-naip", bounds: extent } }, false);
      state.current.stage = "locked"; setStage("locked"); setProgress(100); setNotice("Map locked · detailed aerial image loaded. Choose a tool to begin. Imagery dates and ground resolution vary by site.");
    } catch (error) {
      if (controller.current !== request) return;
      state.current.stage = "positioning"; setStage("positioning"); navigation(true);
      setNotice(request.signal.reason instanceof Error ? request.signal.reason.message : error instanceof Error ? error.message : "Could not load imagery. Retry when connected.");
    } finally { clearTimeout(timeout); if (objectUrl) URL.revokeObjectURL(objectUrl); }
  }
  useEffect(() => {
    if (!container.current || !ready) return;
    const observer = new ResizeObserver(() => { const map = mapRef.current; if (!map) return; map.invalidateSize({ pan: false }); if (state.current.stage === "locked" && overlay.current) map.fitBounds(overlay.current.getBounds(), { animate: false }); });
    observer.observe(container.current); return () => observer.disconnect();
  }, [ready]);
  async function save() {
    if (state.current.stage !== "locked") { setNotice("Lock the map position before saving this view."); return; }
    if (draft.current && layerPoints(draft.current).length) { setNotice("Finish or cancel the area before saving."); return; }
    savingRef.current = true; setSaving(true);
    try { const next = validateMap(state.current.plan); if (next) await onSave(next); dirty.current = false; }
    catch (e) { setNotice(e instanceof Error ? e.message : "Could not save. Your plan is still here."); } finally { savingRef.current = false; setSaving(false); }
  }
  function timeTravel(redo: boolean) {
    const source = redo ? future : history, features = source.at(-1); if (!features) return;
    const previous = state.current.plan.features;
    if (redo) { setFuture(h => h.slice(0, -1)); setHistory(h => [...h, previous]); }
    else { setHistory(h => h.slice(0, -1)); setFuture(h => [...h, previous]); }
    change({ ...state.current.plan, features }, false); setSelected(""); setVertex(null);
  }
  const feature = plan.features.find(f => f.id === selected), activeItems = items.filter(i => !i.archived);
  const toolButton = (value: Tool, label: string, icon: string) => <button type="button" key={value} aria-label={label} aria-pressed={tool === value} title={label} disabled={stage !== "locked" || saving} onClick={() => choose(value)}><span aria-hidden="true">{icon}</span><span>{label}</span></button>;
  return <section className={"map-studio stage-" + stage} aria-label="Project map editor">
    <header className="studio-heading">
      <button disabled={saving} onClick={() => { if (!dirty.current && !corners || confirm("Discard unsaved map changes?")) onClose(); }}>← Back to project</button>
      <div className="studio-title"><p>Planting studio</p><h1>{projectName}</h1></div>
      <button className="admin-save" disabled={saving || !ready || stage !== "locked" || corners > 0} onClick={() => void save()}>{saving ? "Saving…" : "Save map & close"}</button>
    </header>
    <div className="map-position-bar">
      <div className="studio-stage"><span aria-hidden="true">{stage === "locked" ? "02" : "01"}</span><div><strong>{stage === "locked" ? "Map locked" : stage === "loading" ? "Loading detailed imagery" : "Position the site"}</strong><small>{stage === "locked" ? "Choose a tool to shape your plan." : "Pan and zoom to frame the whole project."}</small></div></div>
      {stage === "positioning" ? <div className="record-actions"><button disabled={!ready} onClick={locate}>◎ My location</button><button className="admin-save" disabled={!ready} onClick={() => void lock()}>LOCK MAP POSITION</button></div> : stage === "locked" ? <button disabled={saving} onClick={unlock}>Unlock / reposition</button> : null}
      {stage === "positioning" && <details className="studio-coordinates"><summary>Use coordinates</summary><form className="map-coordinate-form" onSubmit={e => { e.preventDefault(); const values = coords.split(",").map(s => s.trim()); const p = values.map(Number); if (values.length === 2 && values.every(Boolean) && p.every(Number.isFinite) && Math.abs(p[0]) < 85 && Math.abs(p[1]) <= 180) { touched.current = true; mapRef.current?.setView(p as Position, 18); setNotice("Location set. Frame the site, then lock the map."); } else setNotice("Enter latitude, longitude, for example 40.6936, -89.589."); }}><label>Latitude, longitude<input value={coords} onChange={e => setCoords(e.target.value)} placeholder="40.6936, -89.589"/></label><button disabled={!ready}>Go</button></form></details>}
    </div>
    {stage === "locked" && <div className="studio-toolstrip" role="group" aria-label="Map tools">
      <div className="studio-tool-group" role="group" aria-label="Editing tools">{toolButton("select", "Select", "↖")}{toolButton("area", "Draw area", "▱")}{toolButton("text", "Text", "T")}</div>
      <div className="studio-tool-group studio-symbols" role="group" aria-label="Landscape symbols">{Object.entries(symbols).map(([name, icon]) => toolButton(`symbol:${name}`, name[0].toUpperCase() + name.slice(1), icon))}</div>
      <div className="studio-tool-group studio-history" role="group" aria-label="Edit history"><button title="Undo last edit" disabled={saving || !history.length || corners > 0} onClick={() => timeTravel(false)}>↶ Undo</button><button title="Redo last edit" disabled={saving || !future.length || corners > 0} onClick={() => timeTravel(true)}>↷ Redo</button></div>
    </div>}
    <div className="studio-layout" inert={saving}><div className={"studio-map-wrap tool-" + (tool === "select" ? "select" : "place")}><div className="map-canvas" ref={container}/>
      {stage === "loading" && <div className="map-loading" role="status"><span className="loading-flower" aria-hidden="true">🌼</span><h3>Bringing the landscape into focus</h3><p>{notice}</p><progress max={100} value={progress ?? undefined} aria-label="Detailed imagery download"/><small>{progress === null ? "Waiting for imagery provider…" : progress + "% downloaded"}</small><button onClick={unlock}>Cancel loading</button></div>}
    </div><aside className="studio-inspector" aria-label="Plan inspector">
      <div className="studio-panel-tabs" role="group" aria-label="Inspector panels"><button aria-pressed={panel === "plan"} onClick={() => setPanel("plan")}>Plan <span>{plan.features.length}</span></button><button aria-pressed={panel === "items"} onClick={() => setPanel("items")}>Items <span>{activeItems.length}</span></button></div>
      <div className="studio-panel-body">
      {panel === "plan" ? <>
        {feature && stage === "locked" && tool === "select" && <section className="map-feature-editor" key={feature.id}>
          <div className="studio-section-heading"><h2>{feature.kind === "area" ? "Planting area" : feature.kind === "text" ? "Text note" : "Map symbol"}</h2><button aria-label="Deselect feature" onClick={() => setSelected("")}>×</button></div>
          {feature.kind === "area" && <div className="studio-area-reading"><strong>{areaLabel(feature.points)}</strong><span>{feature.points.length} corners</span></div>}
          <label>Title / text<input key={feature.title} maxLength={120} defaultValue={feature.title} onBlur={e => { const title = e.target.value.trim(); if (title && title !== feature.title) edit(feature.id, { title }); else if (!title) e.target.value = feature.title; }}/></label>
          <label className="studio-color-field">Color<input type="color" value={feature.color} onChange={e => edit(feature.id, { color: e.target.value })}/></label>
          {feature.kind === "area" && <><button aria-pressed={moving} onClick={() => setMoving(v => !v)}>{moving ? "Edit corners" : "Move whole shape"}</button><p className="field-hint">{moving ? "Drag the area to move it. Choose Edit corners to reshape it." : "Drag corners to reshape; drag a midpoint to add a corner."}</p><button disabled={vertex === null || feature.points.length <= 3 || moving} onClick={() => { if (vertex !== null) edit(feature.id, { points: feature.points.filter((_, i) => i !== vertex) }); setVertex(null); }}>Remove selected corner</button></>}
          <button className="danger" onClick={() => { change({ ...plan, features: plan.features.filter(f => f.id !== feature.id) }); setSelected(""); }}>Remove feature</button>
        </section>}
        <section><h2>On this map</h2>{plan.features.length ? <div className="map-feature-list">{plan.features.map(f => <button key={f.id} disabled={stage !== "locked"} aria-pressed={f.id === selected && tool === "select"} onClick={() => { if (choose("select", false)) selectFeature(f.id); }}><span aria-hidden="true">{f.kind === "area" ? "▱" : f.kind === "text" ? "T" : symbols[f.symbol || "prairie"]}</span><span>{f.title}<small>{f.kind === "area" ? areaLabel(f.points) : f.projectItemId ? "Project item" : f.kind === "text" ? "Text note" : "Landscape symbol"}</small></span></button>)}</div> : <p className="studio-empty">{stage === "locked" ? "Draw your first planting area or place a symbol using the tools above." : "Frame your site and lock the map to start your planting plan."}</p>}</section>
      </> : <section><h2>Project items</h2><p className="field-hint">Choose an item, then click the map to place it. Only its label is shared; billing quantities stay unchanged.</p><div className="map-item-palette">{activeItems.map(item => <button key={item.id} disabled={stage !== "locked"} aria-pressed={tool === `item:${item.id}`} onClick={() => choose(`item:${item.id}`)}><span aria-hidden="true">🌾</span><span><strong>{item.name}</strong><small>{item.quantityMilli / 1000} {item.unit} · {plan.features.filter(f => f.projectItemId === item.id).length} placed</small></span></button>)}</div>{!activeItems.length && <p className="studio-empty">Add materials and notes in the project notebook to place them here.</p>}</section>}
      </div>
    </aside>
      <div className="studio-context" aria-label="Current map action">
        {stage === "locked" && tool === "area" ? <div className="draw-completion"><div><strong>Draw planting area</strong><span>{corners < 3 ? corners + " corners · add at least 3" : corners + " corners · ready to close"}</span></div><button className="admin-save" disabled={corners < 3} onClick={finishArea}>✓ Finish area</button><button onClick={() => { mapRef.current?.pm.disableDraw(); draft.current = null; setTool("select"); state.current.tool = "select"; setCorners(0); }}>Cancel</button><small>Tap the first corner or press Enter to close.</small></div>
        : stage === "locked" && tool !== "select" ? <div className="studio-placement"><p>Click the map to place <strong>{tool === "text" ? "a note" : tool.startsWith("item:") ? activeItems.find(i => i.id === tool.slice(5))?.name : tool.slice(7)}</strong>.</p><button onClick={() => choose("select", false)}>Done placing</button></div>
        : <p>{stage === "locked" ? feature ? "Edit the selection in the Plan panel. Changes are saved with Save map & close." : "Select a feature to edit it, or choose a drawing tool above." : stage === "loading" ? "Your completed plan is retained while imagery loads." : "Move and zoom the map, then choose Lock map position."}</p>}
      </div>
    </div>
    <footer className="studio-footer"><p className="map-notice" role="status">{notice}</p><details><summary>Imagery & measurements</summary><p>Aerial imagery is historical, not live. USDA detail varies by location. Measurements are approximate, not survey boundaries.</p></details></footer>
  </section>;
}
