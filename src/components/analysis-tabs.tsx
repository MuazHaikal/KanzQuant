"use client";
import { useState,type ReactNode } from "react";
export function AnalysisTabs({items,initial}:{items:{name:string;label?:string;content:ReactNode}[];initial?:string}){const [tab,setTab]=useState(items.some(i=>i.name===initial)?initial:items[0].name);return <><nav className="analysis-tabs" aria-label="Analysis sections">{items.map(i=><button type="button" key={i.name} aria-pressed={tab===i.name} className={tab===i.name?"selected":""} onClick={()=>setTab(i.name)}>{i.label??i.name}</button>)}</nav><div className="analysis-content">{items.find(i=>i.name===tab)?.content}</div></>;}
