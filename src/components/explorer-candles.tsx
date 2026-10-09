"use client";
import { useEffect,useRef } from "react";
import type { Candle } from "@/lib/market-math";
/** Render existing calendar aggregates without creating thousands of SVG elements. */
export function ExplorerCandles({candles,from,to,height,min,max}:{candles:Candle[];from:string;to:string;height:number;min:number;max:number}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const canvas=ref.current!;function draw(){const ctx=canvas.getContext("2d");if(!ctx)return;const width=canvas.clientWidth,ratio=devicePixelRatio||1;canvas.width=width*ratio;canvas.height=height*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);const css=getComputedStyle(document.documentElement),low=Date.parse(from),high=Date.parse(to),extent=max-min||1,scale=width/1000,plotHeight=height-38*scale,x=(date:string)=>width*(.065+(Date.parse(date)-low)/(high-low)*.915),y=(v:number)=>14*scale+(max-v)/extent*plotHeight,barWidth=Math.max(1,Math.min(10,915/Math.max(1,candles.length)*.6))*scale;for(const b of candles){ctx.strokeStyle=ctx.fillStyle=css.getPropertyValue(b.close>=b.open?"--positive":"--negative").trim();ctx.beginPath();ctx.moveTo(x(b.end),y(b.high));ctx.lineTo(x(b.end),y(b.low));ctx.stroke();ctx.fillRect(x(b.end)-barWidth/2,y(Math.max(b.open,b.close)),barWidth,Math.max(1,Math.abs(y(b.open)-y(b.close))));}}const resize=new ResizeObserver(draw),theme=new MutationObserver(draw);resize.observe(canvas);theme.observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});draw();return()=>{resize.disconnect();theme.disconnect();};},[candles,from,to,height,min,max]);
 return <canvas ref={ref} className="explorer-candles" style={{height}} aria-hidden="true"/>;
}
