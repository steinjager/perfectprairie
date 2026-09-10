import type { Position, ProjectMap } from "./operations";
export const imageryService = "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer";
export const imageryAttribution = "USDA, USGS The National Map: Orthoimagery";
export const defaultCenter: Position = [40.6936, -89.589];
const R = 6378137;
export function projectPoint([lat, lng]: Position): Position { return [R * lng * Math.PI / 180, R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))]; }
export function previewBounds(map: ProjectMap): [number, number, number, number] {
  const points = map.features.flatMap(f => f.points).map(projectPoint);
  if (!points.length) {
    const [x,y] = projectPoint(map.center), half = 156543.033928 * 1000 / 2 ** map.zoom / 2;
    return [x-half,y-half*.6,x+half,y+half*.6];
  }
  const xs = points.map(p=>p[0]), ys = points.map(p=>p[1]);
  const cx=(Math.min(...xs)+Math.max(...xs))/2, cy=(Math.min(...ys)+Math.max(...ys))/2;
  const width=Math.max(100, (Math.max(...xs)-Math.min(...xs))*1.35, (Math.max(...ys)-Math.min(...ys))*1.35/0.6);
  return [cx-width/2,cy-width*.3,cx+width/2,cy+width*.3];
}
export function backgroundUrl(map: ProjectMap) {
  return imageryService + "/export?" + new URLSearchParams({ bbox: previewBounds(map).join(","), bboxSR:"3857", imageSR:"3857", size:"1000,600", format:"jpg", f:"image" });
}
