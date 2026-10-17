"use client";
export default function Error({reset}:{reset:()=>void}){return <section className="panel"><div className="panel-head"><h1>Evidence Library unavailable</h1></div><div className="panel-body">Real persisted research and the research ledger are required. No demo fallback is used.<button onClick={reset}>Retry</button></div></section>;}
