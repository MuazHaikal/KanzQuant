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
const {DataCatalogue}=load('src/components/data-catalogue.tsx');
const stored={id:'fred',technicalId:'DGS10',name:'US 10Y Treasury Yield',description:'Daily Treasury yield',kind:'Macro',category:'Rates',frequency:'Daily',unit:'%',source:'FRED',from:'1962-01-02',to:'2026-10-01',count:16173,updated:'2026-10-04 13:03Z',latest:5.24,href:'/chart?series=DGS10',preview:[]};
const render=props=>renderToStaticMarkup(React.createElement(DataCatalogue,{rows:[stored],asOf:'2026-10-17',...props}));
const html=render({});
for(const label of ['16d old','16,173','Observation date','Metadata updated','Finite stored observations','Technical details','aria-sort','aria-label="Search data catalogue"'])assert(html.includes(label),label);
assert(!html.includes('<details class="catalogue-technical" open'));
const missing=render({rows:[{...stored,latest:Infinity,from:'Unavailable',to:'Unavailable',count:0}]});
assert(missing.includes('Unavailable'));assert(!/NaN|Infinity|undefined/.test(missing));
const empty=render({initialQuery:'not-a-dataset'});assert(empty.includes('Clear filters'));assert(!empty.includes('<h2>US 10Y Treasury Yield'));
const fundamental=render({rows:[{...stored,kind:'Fundamental',latest:null,updated:'Filed 2026-10-04'}]});assert(fundamental.includes('Latest filing'));assert(fundamental.includes('Reported quarters'));
const {numberText}=load('src/lib/evidence.ts');assert.equal(numberText(-.0001),'0.00');
const {number}=load('src/components/focus-panels.tsx');assert.equal(number(-.0001),'0.00');assert.equal(number(.0001),'0.00');
const {ContributionBars}=load('src/components/visual-research.tsx');assert(!renderToStaticMarkup(React.createElement(ContributionBars,{rows:[{name:'Tiny',value:-.0001}]})).includes('-0.00'));
const css=readFileSync('src/app/phase-five.css','utf8');assert(css.includes('.catalogue-detail-rail>.panel{flex-shrink:0}'),'Rail overflow must not shrink and clip panels');assert(css.includes('overflow-y:auto'));
console.log('Phase 5: real-age freshness, stored counts, unavailable/nonfinite/empty/quarterly states, collapsed metadata, accessible controls and normalized display zeros passed.');
