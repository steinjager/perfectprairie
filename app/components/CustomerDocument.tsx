/* eslint-disable @next/next/no-img-element */
import MapPreview from "./MapPreview";
import { money, pretty, type ProjectMap } from "@/lib/operations";
export type CustomerDocumentData = { id: string; kind: "estimate" | "invoice"; number: string; status: string; issueDate: string; dueDate: string | null; notes: string; planJson?: string | null; totalCents: number; items: { description: string; quantityMilli: number; unitPriceCents: number }[] };
export default function CustomerDocument({ document, project, clientName }: { document: CustomerDocumentData; project: { name: string; map: ProjectMap | null; url?: string }; clientName?: string }) {
  let attachedMap: ProjectMap | null = null;
  if(document.kind==="estimate") { try { attachedMap = document.planJson ? JSON.parse(document.planJson) : null; } catch {} }
  return <article className="customer-document" id={document.id}>
    <header className="document-heading"><div className="document-brand"><img src="/images/perfect-prairie-logo-carolina-mantis.png" alt="Perfect Prairie" width="144" height="138"/><div><strong>Perfect Prairie</strong><small>Native landscape design and installation<br/>Prairie and Wildflower Plots · Consultations</small><small>P. O. Box 104 Bushnell, IL 61415</small></div></div><div><p>{pretty(document.kind)}</p><h2>{document.number}</h2></div></header>
    <div className="document-meta"><div><small>Project</small><strong>{project.name}</strong>{clientName&&<span>Prepared for {clientName}</span>}</div><div><span>Issued {document.issueDate}</span>{document.dueDate&&<span>{document.kind==="invoice"?"Due":"Valid until"} {document.dueDate}</span>}</div></div>
    <table><thead><tr><th scope="col">Description</th><th scope="col">Qty</th><th scope="col">Rate</th><th scope="col">Amount</th></tr></thead><tbody>{document.items.map((item,i)=><tr key={i}><td>{item.description}</td><td>{item.quantityMilli/1000}</td><td>{money(item.unitPriceCents)}</td><td>{money(Math.round(item.quantityMilli*item.unitPriceCents/1000))}</td></tr>)}</tbody></table>
    <div className="document-total"><span>{document.kind==="estimate"?"Estimate total":document.status==="paid"?"Total paid":"Total due"}</span><strong>{money(document.totalCents)}</strong></div>
    {attachedMap&&<div className="document-map"><h3>Your planting plan</h3><MapPreview map={attachedMap}/>{project.url&&<a href={project.url}>{project.url}</a>}</div>}
    <div className="document-closing"><img className="document-flower" src="/images/invoice-coneflower-bluestem.png" alt=""/><div><p>Please make checks payable to Oak Grove Homestead.</p><p>Thank you for your business and supporting the biodiversity of Illinois!</p></div><img className="document-flower" src="/images/invoice-susan-monarch.png" alt=""/></div>
    {document.kind==="invoice"&&<div className="document-review"><div><strong>Please leave us a review!</strong><p>Scan to share your experience with Perfect Prairie.</p></div><a href="https://perfectprairie.com/review"><img src="/images/google-review-qr.png" alt="Scan to review Perfect Prairie on Google" width="96" height="96"/></a></div>}
    <footer><strong>Less lawn. More habitat.</strong><div><a href="mailto:contact@perfectprairie.com">contact@perfectprairie.com</a><a href="https://www.perfectprairie.com">www.perfectprairie.com</a><a href="tel:+13096132016">309-613-2016</a></div></footer>
  </article>;
}
