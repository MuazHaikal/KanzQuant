"use client";
export default function ForecastError({reset}:{reset:()=>void}){return <section className="forecast-empty" role="alert"><h1>DATA UNAVAILABLE</h1><p>Time-series research could not load.</p><button onClick={reset}>RETRY →</button></section>;}
