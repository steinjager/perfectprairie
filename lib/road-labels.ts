import type * as Leaflet from "leaflet";
import { projectPoint } from "./map";
export const roadService = "https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer";
export function roadLabelUrl(bounds: [number,number,number,number], width=1000, height=600) {
  return roadService+"/export?"+new URLSearchParams({bbox:bounds.join(","),bboxSR:"3857",imageSR:"3857",size:`${Math.max(1,Math.round(width))},${Math.max(1,Math.round(height))}`,format:"png32",transparent:"true",layers:"show:16,17,18,19,20,21",f:"image"});
}
/** Transparent, non-interactive labels remain above the locked aerial photograph. */
export function addRoadLabels(L:typeof Leaflet,map:Leaflet.Map) {
  const pane=map.createPane("road-labels"); pane.style.zIndex="450"; pane.style.pointerEvents="none";
  let current:Leaflet.ImageOverlay|undefined, pending:Leaflet.ImageOverlay|undefined, disposed=false;
  const update=()=>{
    if(disposed)return;
    const b=map.getBounds(),sw=projectPoint([b.getSouth(),b.getWest()]),ne=projectPoint([b.getNorth(),b.getEast()]),size=map.getSize();
    pending?.remove();
    const layer=L.imageOverlay(roadLabelUrl([sw[0],sw[1],ne[0],ne[1]],size.x,size.y),b,{pane:"road-labels",interactive:false,opacity:0,attribution:"USGS · Census TIGER/Line road labels"}); pending=layer;
    layer.on("load",()=>{if(disposed||pending!==layer)return;current?.remove();current=layer;pending=undefined;layer.setOpacity(1);});
    layer.on("error",()=>{if(pending===layer){layer.remove();pending=undefined;}});
    layer.addTo(map);
  };
  map.on("moveend resize",update);update();
  return ()=>{disposed=true;map.off("moveend resize",update);pending?.remove();current?.remove();};
}
