/* eslint-disable @next/next/no-img-element */
import { backgroundUrl, imageryAttribution, previewBounds, projectPoint } from "@/lib/map";
import { symbols, type ProjectMap } from "@/lib/operations";

export default function MapPreview({ map, title = "Project planting plan" }: { map: ProjectMap; title?: string }) {
  const [minX,minY,maxX,maxY] = previewBounds(map);
  const point = (p: [number,number]) => { const [x,y]=projectPoint(p); return [(x-minX)/(maxX-minX)*1000,600-(y-minY)/(maxY-minY)*600]; };
  return <figure className="plan-preview" aria-label={title}>
    <img src={backgroundUrl(map)} alt="Aerial view of the project" referrerPolicy="no-referrer" />
    <svg viewBox="0 0 1000 600" role="img" aria-label={title}>
      {map.features.map(f => { const [x,y]=point(f.points[0]); return f.kind === "area" ?
        <g key={f.id}><polygon points={f.points.map(p=>point(p).join(",")).join(" ")} fill={f.color} fillOpacity=".35" stroke={f.color} strokeWidth="4" /><text x={x+8} y={y-8} paintOrder="stroke" stroke="#fffaf0" strokeWidth="4" fill="#38231c" fontSize="22" fontWeight="600">{f.title}</text></g> :
        <g key={f.id}><text x={x} y={y} paintOrder="stroke" stroke="#fffaf0" strokeWidth="5" fill={f.color} fontSize={f.kind === "symbol" ? 32 : 24}>{f.kind === "symbol" ? symbols[f.symbol || "prairie"] : f.title}</text>{f.kind === "symbol" && <text x={x+34} y={y} paintOrder="stroke" stroke="#fffaf0" strokeWidth="4" fontSize="20" fill="#38231c">{f.title}</text>}</g>; })}
    </svg>
    <figcaption>{imageryAttribution} · Planning measurements are approximate</figcaption>
  </figure>;
}
