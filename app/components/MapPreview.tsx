/* eslint-disable @next/next/no-img-element */
import { backgroundUrl, detailAttribution, imageryAttribution, previewBounds, projectPoint } from "@/lib/map";
import { symbols, areaLabel, type ProjectMap } from "@/lib/operations";
import { roadLabelUrl } from "@/lib/road-labels";

export default function MapPreview({ map, title = "Project planting plan" }: { map: ProjectMap; title?: string }) {
  const [minX,minY,maxX,maxY] = previewBounds(map);
  const height = 1000 * (maxY-minY)/(maxX-minX);
  const point = (p: [number,number]) => { const [x,y]=projectPoint(p); return [(x-minX)/(maxX-minX)*1000,height-(y-minY)/(maxY-minY)*height]; };
  return <figure className="plan-preview" aria-label={title} style={{aspectRatio:`1000 / ${height}`}}>
    <img src={backgroundUrl(map)} alt="Aerial view of the project" referrerPolicy="no-referrer" />
    <img src={roadLabelUrl([minX,minY,maxX,maxY],1000,height)} alt="Street names" referrerPolicy="no-referrer" />
    <svg viewBox={`0 0 1000 ${height}`} role="img" aria-label={title}>
      {map.features.map(f => { const [x,y]=point(f.points[0]); return f.kind === "area" ?
        <g key={f.id}><polygon points={f.points.map(p=>point(p).join(",")).join(" ")} fill={f.color} fillOpacity=".35" stroke={f.color} strokeWidth="4" /><text x={f.points.map(p=>point(p)[0]).reduce((a,b)=>a+b,0)/f.points.length} y={f.points.map(p=>point(p)[1]).reduce((a,b)=>a+b,0)/f.points.length} textAnchor="middle" paintOrder="stroke" stroke="#fffaf0" strokeWidth="4" fill="#38231c" fontSize="20" fontWeight="600">{f.title.slice(0,32)}<tspan x={f.points.map(p=>point(p)[0]).reduce((a,b)=>a+b,0)/f.points.length} dy="24" fontSize="18">{areaLabel(f.points)}</tspan></text></g> :
        <g key={f.id}><text x={x} y={y} paintOrder="stroke" stroke="#fffaf0" strokeWidth="5" fill={f.color} fontSize={f.kind === "symbol" ? 32 : 24}>{f.kind === "symbol" ? symbols[f.symbol || "prairie"] : f.title}</text>{f.kind === "symbol" && <text x={x+34} y={y} paintOrder="stroke" stroke="#fffaf0" strokeWidth="4" fontSize="20" fill="#38231c">{f.title}</text>}</g>; })}
    </svg>
    <figcaption>{map.frame ? detailAttribution : imageryAttribution} · USGS / Census road labels · Approximate measurements</figcaption>
  </figure>;
}
