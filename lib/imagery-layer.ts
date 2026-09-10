import type * as Leaflet from "leaflet";
import { imageryService } from "./map";

// The public USGS tile cache can stop at zoom 16 even though its metadata
// advertises higher levels. Render high-zoom tiles through the export endpoint.
export function imageryTileUrl({x,y,z}:{x:number;y:number;z:number}) {
  if(z<=16)return `${imageryService}/tile/${z}/${y}/${x}`;
  const extent=20037508.342789244, size=extent*2/2**z;
  const left=-extent+x*size, top=extent-y*size;
  return imageryService+"/export?"+new URLSearchParams({bbox:[left,top-size,left+size,top].join(","),bboxSR:"3857",imageSR:"3857",size:"256,256",format:"jpg",f:"image"});
}
export function imageryLayer(L:typeof Leaflet) {
  const layer=L.tileLayer("",{maxZoom:22,maxNativeZoom:20,crossOrigin:"anonymous",referrerPolicy:"no-referrer",attribution:'<a href="https://www.usgs.gov/the-national-map-data-delivery" target="_blank" rel="noreferrer">USDA, USGS The National Map</a>'});
  layer.getTileUrl=imageryTileUrl;
  return layer;
}
