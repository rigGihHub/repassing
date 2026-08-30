'use client';
export default function PrintButton({label}:{label:string}){return <button className="secondary receiptPrintButton" type="button" onClick={()=>window.print()}>{label}</button>}
