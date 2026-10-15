import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const source=fs.readFileSync("src/lib/equity-screen.ts","utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};new Function("require","module","exports",compiled)(require,mod,mod.exports);
const {screenRows,presetMatches}=mod.exports;
const a={symbol:"MU",name:"Micron",sector:"Technology",features:{momentum_12_1:20,momentum_percentile:90,z20:-2,sma200_distance:10,fcf:5}};
const b={symbol:"JPM",name:"JPMorgan",sector:"Financials",features:{momentum_12_1:null,momentum_percentile:20,z20:1,sma200_distance:-1,fcf:null}};
const filters={query:"",sector:"",preset:"All equities",minimums:{},maximums:{},fcf:""};
assert(presetMatches(a,"Short-Term Reversals"));assert(!presetMatches(b,"Short-Term Reversals"));
assert.equal(screenRows([b,a],filters,"momentum_12_1")[0].symbol,"MU");
assert.equal(screenRows([a,b],{...filters,query:"micron"},"price").length,1);
assert.equal(screenRows([a,b],{...filters,sector:"Financials"},"price")[0].symbol,"JPM");
assert.equal(screenRows([a,b],{...filters,minimums:{z20:"0"}},"price")[0].symbol,"JPM");
assert.equal(screenRows([a,b],{...filters,maximums:{z20:"-1"}},"price")[0].symbol,"MU");
assert.equal(screenRows([a,b],{...filters,fcf:"positive"},"price").length,1);
assert.equal(screenRows([a,b],filters,"momentum_12_1",true).at(-1).symbol,"JPM");
const complete={...a,features:{...a.features,high52_proximity:-2,volatility_percentile:90,drawdown:-35,revenue_ttm_growth:25,operating_margin:12}};
for(const preset of mod.exports.PRESETS){assert(presetMatches(complete,preset));if(preset!=="All equities")assert(!presetMatches({...a,features:{}},preset));}
console.log("Equity screener filters, sorting, nulls and deterministic presets passed");
const base=process.env.FOCUS_TEST_URL??"http://localhost:3001";
for(const symbol of ["MU","AAPL","JPM","XOM","WMT","NVDA"]){
 const response=await fetch(base+"/api/equities/"+symbol);assert.equal(response.status,200);
 const r=await response.json();assert(r.bars.length>1000);assert(r.fundamentals.length>10);assert(r.features.price>0);assert(r.evidence.neighbours.length>0);assert(r.macro.groups.length>0);
 assert(r.bars.every(b=>b.high>=Math.max(b.open,b.close)&&b.low<=Math.min(b.open,b.close)));
 if(symbol==="JPM")assert(r.fundamentals.every(q=>q.fcf==null));
 console.log(symbol,JSON.stringify({prices:r.bars.length,quarters:r.fundamentals.length,setups:r.evidence.neighbours.length,date:r.priceDate}));
}
assert.equal((await fetch(base+"/api/equities/NOTREAL")).status,404);
const missing=await (await fetch(base+"/api/equities/ASML")).json();assert.equal(missing.fundamentals.length,0);assert(missing.bars.length>1000);
const recent=await (await fetch(base+"/api/equities/VYLR")).json();assert(recent.bars.length<252);assert.equal(recent.evidence.neighbours.length,0);
for(const path of ["/equities","/equities/MU","/equities/screener"]){const r=await fetch(base+path);assert.equal(r.status,200);const html=await r.text();assert(!html.includes(">NaN<"));assert(html.includes("Equities"));}
console.log("Real equity API, OHLC normalization, fundamentals, historical evidence, macro context and routes passed");
