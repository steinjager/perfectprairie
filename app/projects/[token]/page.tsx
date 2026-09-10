import { notFound } from "next/navigation";
import Link from "next/link";
import { customerProject } from "@/lib/public-project";
import MapPreview from "@/app/components/MapPreview";
import CustomerDocument from "@/app/components/CustomerDocument";
import { areaLabel, publicOrigin, symbols } from "@/lib/operations";
import PrintButton from "./PrintButton";
export const dynamic="force-dynamic";
export const metadata={title:"Your project | Perfect Prairie",robots:{index:false,follow:false},referrer:"no-referrer"};
export default async function ProjectPage({params}:{params:Promise<{token:string}>}){
  const {token}=await params, project=await customerProject(token);
  if(!project)notFound();
  return <main className="customer-project"><header className="customer-project-heading"><Link href="/">Perfect Prairie</Link><PrintButton/></header><section className="project-intro"><p className="admin-kicker">Your project</p><h1>{project.name}</h1>{project.summary&&<p>{project.summary}</p>}</section>
    {project.map&&<><MapPreview map={project.map}/><section className="plan-legend"><h2>The planting plan</h2>{project.map.features.map(f=><div key={f.id}><span style={{background:f.color}}/ ><strong>{f.kind==="symbol"?symbols[f.symbol||"prairie"]+" ":""}{f.title}</strong>{f.kind==="area"&&<small>{areaLabel(f.points)}</small>}</div>)}</section></>}
    {project.documents.length>0&&<nav className="document-links" aria-label="Project documents">{project.documents.map(d=><a href={"#"+d.id} key={d.id}>{d.number}</a>)}</nav>}
    {project.documents.map(document=><CustomerDocument key={document.id} document={document} project={{name:project.name,map:project.map,url:publicOrigin+"/projects/"+token}}/>)}
    <p className="customer-footer">Questions about your project? <a href="mailto:contact@perfectprairie.com">Contact Perfect Prairie</a></p>
  </main>;
}
