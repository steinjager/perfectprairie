/* eslint-disable @next/next/no-img-element */
import MapPreview from "./MapPreview";
import { money, pretty, type ProjectMap } from "@/lib/operations";
export type CustomerDocumentData = { id: string; kind: "estimate" | "invoice"; number: string; status: string; issueDate: string; dueDate: string | null; notes: string; totalCents: number; items: { description: string; quantityMilli: number; unitPriceCents: number }[] };
export default function CustomerDocument({ document, project, clientName }: { document: CustomerDocumentData; project: { name: string; map: ProjectMap | null; url?: string }; clientName?: string }) {
  return <article className="customer-document" id={document.id}>
    <img className="document-art document-art-left" src="/images/invoice-coneflower-bluestem.png" alt=""/>
    <img className="document-art document-art-right" src="/images/invoice-susan-monarch.png" alt=""/>
    <header className="document-heading"><div><img src="/images/perfect-prairie-logo-carolina-mantis.png" alt="Perfect Prairie" width="78" height="75"/><div><strong>Perfect Prairie</strong><small>Native landscapes · Central Illinois</small></div></div><div><p>{pretty(document.kind)}</p><h2>{document.number}</h2><span>{pretty(document.status)}</span></div></header>
    <div className="document-meta"><div><small>Project</small><strong>{project.name}</strong>{clientName&&<span>Prepared for {clientName}</span>}</div><div><span>Issued {document.issueDate}</span>{document.dueDate&&<span>{document.kind==="invoice"?"Due":"Valid until"} {document.dueDate}</span>}</div></div>
    <table><thead><tr><th scope="col">Description</th><th scope="col">Qty</th><th scope="col">Rate</th><th scope="col">Amount</th></tr></thead><tbody>{document.items.map((item,i)=><tr key={i}><td>{item.description}</td><td>{item.quantityMilli/1000}</td><td>{money(item.unitPriceCents)}</td><td>{money(Math.round(item.quantityMilli*item.unitPriceCents/1000))}</td></tr>)}</tbody></table>
    <div className="document-total"><span>{document.kind==="estimate"?"Estimate total":document.status==="paid"?"Total paid":"Total due"}</span><strong>{money(document.totalCents)}</strong></div>
    {document.notes&&<div className="document-notes"><h3>Notes & terms</h3><p>{document.notes}</p></div>}
    {project.map&&<div className="document-map"><h3>Your planting plan</h3><MapPreview map={project.map}/>{project.url&&<a href={project.url}>{project.url}</a>}</div>}
    {!project.map&&project.url&&<p className="document-project-link">Your project: <a href={project.url}>{project.url}</a></p>}
    {document.kind==="invoice"&&<div className="document-review"><div><strong>We’d be grateful for a Google review.</strong><p>Scan to share your experience with Perfect Prairie.</p></div><img src="/images/google-review-qr.png" alt="Scan to review Perfect Prairie on Google" width="108" height="108"/></div>}
    <footer><strong>Less lawn. More habitat.</strong><span>contact@perfectprairie.com · perfectprairie.com</span></footer>
  </article>;
}
