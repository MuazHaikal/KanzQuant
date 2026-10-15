"use client";
export default function ErrorView({reset}:{reset:()=>void}){return <section className="panel panel-body"><h1>Equity research unavailable</h1><p>Cached data could not be loaded.</p><button onClick={reset}>Retry</button></section>;}
