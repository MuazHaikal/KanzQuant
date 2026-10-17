import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url),cache=new Map();
function load(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file);
 const exports={};cache.set(file,exports);
 const resolve=name=>{
  if(name==='next/link')return {default:({href,children,...props})=>React.createElement('a',{href,...props},children)};
  if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?path.resolve('src',name.slice(2)):path.resolve(path.dirname(file),name);const target=['.ts','.tsx'].map(ext=>base+ext).find(existsSync);if(target)return load(target);}
  return require(name);
 };
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:resolve,Number,Math,Set,Map,Date,structuredClone,URLSearchParams});return exports;
}
const {evidenceTone}=load('src/lib/evidence.ts');
for(const [state,effect,tone] of [['significant',-2,'negative'],['significant',2,'positive'],['not-significant',2,'neutral'],['insufficient',2,'insufficient'],['significant',null,'neutral'],['significant',NaN,'neutral']])assert.equal(evidenceTone(state,effect),tone);
const {StudyFocus}=load('src/components/study-focus.tsx');
const base={id:'phase-test',name:'Stored study',status:'complete',started_at:'2026-10-17',completed_at:'2026-10-17',metadata:{research_date:'2026-09-30'},adjusted_p:.02,family_count:3,parameters:{mode:'conditional',conditions:[{source:'credit',metric:'3',op:'below',threshold:10}],asset:'SPX',horizon:3,spacing:3,method:'Welch t-test',baseline:'others',alternative:'two-sided',family:'verification'},result:{summary:{status:'COMPLETE',event:{n:40,mean:-2},control:{n:60,mean:0},baseline:{n:60,mean:0},difference:-2,ci:[-3,-1],p:.01,evidence:'MODERATE'},distribution:{event:[-3,-1],control:[0,1]},cases:[],robustness:[],agreement:{agree:0,available:0},diagnostics:{minimum_sample:10},technical:{}}};
function render(run){return renderToStaticMarkup(React.createElement(StudyFocus,{run}));}
const html=render(base);for(const label of ['evidence-tone-negative','primary-metric','secondary-metric','Sample size (n)','95% confidence interval','Adjusted p-value','Raw p-value','Historical cases','Robustness','Condition logic'])assert(html.includes(label),label);
assert(html.indexOf('Adjusted p-value')<html.indexOf('Raw p-value'));assert(!/<input|<select|<form/.test(html));
assert(!html.includes('EVENT PERIODS'),'Logic stays distinct from group results');assert(html.includes('FORWARD RETURN'));
const insufficient=render({...base,adjusted_p:null,result:{...base.result,summary:{...base.result.summary,status:'INSUFFICIENT SAMPLE',event:{n:0},difference:null,ci:null,p:null}}});
assert(insufficient.includes('evidence-tone-insufficient'));assert(insufficient.includes('Unavailable'));assert(!insufficient.includes('NaN'));assert(!insufficient.includes('—%'));
const neutral=render({...base,adjusted_p:.4});assert(neutral.includes('Not statistically significant'));assert(neutral.includes('evidence-tone-neutral'));
const css=readFileSync('src/app/phase-one.css','utf8');assert(css.includes('--shell-bar:52px'));assert(css.includes('height:46px'));assert(css.includes('.primary-metric'));assert(css.includes('.study-toolbar'));assert(css.includes('.evidence-table-scroll'));
console.log('Phase 1: directional/neutral/insufficient semantics, unequal metric priority, read-only exact condition/target, missing values, contained metadata and compact shell contracts passed.');
