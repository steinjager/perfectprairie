"use client";
import { useState } from "react";
export default function PrintButton(){
  const [busy,setBusy]=useState(false);
  async function print(){setBusy(true);await Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{})));window.print();setBusy(false);}
  return <button className="customer-print" disabled={busy} onClick={()=>void print()}>{busy?"Preparing…":"Print / save PDF"}</button>;
}
