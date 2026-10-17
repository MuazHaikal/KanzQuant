"use client";
import {useRouter} from "next/navigation";
import {startTransition} from "react";
export default function CatalogueError({reset}:{reset:()=>void}){const router=useRouter();return <section className="panel catalogue-state" role="alert"><h1>Data temporarily unavailable</h1><p>The stored catalogue could not be loaded. Please retry.</p><button className="study-open" onClick={()=>startTransition(()=>{router.refresh();reset();})}>Retry catalogue</button></section>;}
