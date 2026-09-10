"use client";
import { useEffect, useRef } from "react";
import { parseMap, type Project } from "@/lib/admin-types";
import { defaultCenter } from "@/lib/map";
import { imageryLayer } from "@/lib/imagery-layer";

export default function ProjectsMap({ projects, onOpen }: { projects: Project[]; onOpen: (project: Project) => void }) {
  const container=useRef<HTMLDivElement>(null);
  const callback=useRef(onOpen);
  useEffect(()=>{callback.current=onOpen;},[onOpen]);
  useEffect(()=>{
    let disposed=false; let cleanup: (()=>void)|undefined;
    void import("leaflet").then(L=>{
      if(disposed||!container.current)return;
      const map=L.map(container.current,{maxZoom:21}).setView(defaultCenter,9);
      cleanup=()=>map.remove();
      imageryLayer(L).addTo(map);
      const points: [number,number][]=[];
      projects.forEach(p=>{const plan=parseMap(p);if(!plan)return;const position=plan.features[0]?.points[0]||plan.center;points.push(position);
        const button=document.createElement("span");button.className="map-project-pin";button.textContent="🌾";button.setAttribute("aria-hidden","true");
        const label=document.createElement("span");label.textContent=p.name;
        const marker=L.marker(position,{title:p.name,icon:L.divIcon({html:button,className:"",iconSize:[36,36]})}).addTo(map).bindTooltip(label).on("click",()=>callback.current(p));
        marker.getElement()?.setAttribute("aria-label",p.name);
      });
      if(points.length)map.fitBounds(points,{padding:[60,60],maxZoom:17});
      else if(navigator.geolocation)navigator.geolocation.getCurrentPosition(p=>{if(!disposed)map.setView([p.coords.latitude,p.coords.longitude],12);},()=>{}, {timeout:8000});
    });
    return()=>{disposed=true;cleanup?.();};
  },[projects]);
  return <div ref={container} className="projects-map" aria-label="Mapped projects"/>;
}
