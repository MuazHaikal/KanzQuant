import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const exports={};vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/evidence.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:()=>({humanName:s=>s}),Number,Math,Map,Set});
const {evidenceState,studySummary,filterStudies,numberText,pText}=exports;
const stats={status:"COMPLETE",event:{n:30},control:{n:100},p:.01};
assert.equal(evidenceState(stats,.06,"family"),"not-significant");assert.equal(evidenceState(stats,.04,"family"),"significant");assert.equal(evidenceState(stats,null,"family"),"insufficient");assert.equal(evidenceState(stats,null,""),"significant");
assert.equal(evidenceState({...stats,event:{n:9}},.01,"family"),"insufficient");assert.equal(evidenceState({...stats,control:{n:2}},.01,"family"),"insufficient");assert.equal(evidenceState({...stats,p:NaN},null,""),"insufficient");
assert.equal(numberText(NaN),"—");assert.equal(numberText(null),"—");assert.equal(pText(null),"Not available");assert.equal(pText(.00001),"<0.0001");
const run={id:"x",name:"Credit condition",parameters:{conditions:[{source:"credit"}],asset:"SPX",horizon:6,mode:"conditional",family:"test"},result:{summary:{...stats,difference:2,evidence:"WEAK"},distribution:{event:[-1,0,1,2,null,NaN]},agreement:{agree:3,available:5}},adjusted_p:.06,metadata:{research_date:"2026-09-30"},started_at:"2026-10-17"};
const summary=studySummary(run);assert.equal(summary.hit,50);assert.equal(summary.n,30);assert.equal(summary.effect,2);assert.equal(summary.evidence,"WEAK");assert.equal(summary.state,"not-significant");assert.equal(studySummary({...run,result:null}).state,"insufficient");
const filters={query:"",theme:"",asset:"",horizon:"",state:"",minimum:""};
const rows=[{...summary,id:"unadjusted",adjustedP:null,n:200},{...summary,id:"lowN",adjustedP:.01,n:30},{...summary,id:"highN",adjustedP:.01,n:100},{...summary,id:"q2",adjustedP:.02,n:200},{...summary,id:"robust",adjustedP:.01,n:100,agreement:5}];
assert.equal(filterStudies(rows,filters).map(s=>s.id).join(","),"robust,highN,lowN,q2,unadjusted");assert.equal(rows[0].id,"unadjusted","Do not mutate caller data");
assert.equal(filterStudies(rows,{...filters,query:"credit",asset:"SPX",theme:"credit",horizon:"6",minimum:"100",state:"not-significant"}).length,4);assert.equal(filterStudies(rows,{...filters,query:"absent"}).length,0);assert.equal(filterStudies(rows,filters,"adjustedP",false).at(-1).id,"unadjusted");
const css=readFileSync("src/app/canonical-migration.css","utf8"),component=readFileSync("src/components/evidence-library.tsx","utf8");assert.match(css,/\.workstation-table-scroll[^}]*overflow/);assert.match(css,/thead[^}]*sticky/);assert.match(component,/tabIndex=\{0\}/);assert.match(component,/aria-sort=/);assert(!component.includes("/api/hypothesis/prepare"));
if(process.env.FOCUS_TEST_URL){
 const base=process.env.FOCUS_TEST_URL;
 const legacy=await fetch(base+"/hypothesis?source=credit",{redirect:"manual"});assert.equal(legacy.status,307);assert.match(legacy.headers.get("location"),/^\/evidence\?source=credit/);
 const response=await fetch(base+"/evidence");assert.equal(response.status,200);const html=await response.text();assert(html.includes("PRECOMPUTED RESEARCH"));assert(html.includes("Adjusted p"));assert(!/Run Test|Build Hypothesis|SEE HISTORICAL EVIDENCE/.test(html));
 const id=html.match(/href="\/evidence\/([a-f0-9-]{36})"/)?.[1];assert(id,"Library must show a real completed study");
 const focus=await fetch(base+"/evidence/"+id);assert.equal(focus.status,200);const detail=await focus.text();for(const label of ["Sample size (n)","95% confidence interval","Adjusted p-value","Historical cases","Robustness","Research settings"])assert(detail.includes(label),label);assert(!detail.includes(">NaN"));
 assert.equal((await fetch(base+"/evidence/invalid")).status,404);
 for(const route of ["prepare","run"])assert.equal((await fetch(base+"/api/hypothesis/"+route,{method:"POST",body:"{}"})).status,403);
 console.log("Real ledger, legacy redirect, Study Focus/statistics, missing ID and public execution denial passed; study "+id);
}
console.log("Evidence significance, missing/small samples, real positive frequency, stable default sorting, filters, no mutation, internal scroll and keyboard semantics passed.");
