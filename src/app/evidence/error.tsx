"use client";
export default function ErrorView({reset}:{reset:()=>void}){return <section className="panel panel-body"><h1>Evidence Library unavailable</h1><p>Stored studies could not be loaded. No research was executed.</p><button onClick={reset}>Retry</button></section>;}
