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
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:resolve,Number,Math,Set,Map,Date});return exports;
}
const render=(component,props)=>renderToStaticMarkup(React.createElement(component,props));
const {BenchmarkVerdict,ValidationSummary,formatValidationDelta}=load('src/components/forecast-validation-summary.tsx');
const result={lowest_tested:'AR(1)',conclusion:'DID NOT OUTPERFORM BASELINE',policy:{target:'Level'},validation:{origins:24,evaluation_start:'2015-03-31',evaluation_end:'2026-09-30'},models:[{name:'Naive',metrics:{rmse:.9}},{name:'AR(1)',metrics:{rmse:.659,rmse_delta:1.2},comparison_baseline:{rmse:.651}}]};
const verdict=render(BenchmarkVerdict,{result});assert(verdict.includes('0.651'));assert(!verdict.includes('0.900'));assert(verdict.includes('+1.2%'));assert(verdict.includes('not statistical significance'));
for(const rmse_delta of [null,NaN,Infinity]){const html=render(BenchmarkVerdict,{result:{...result,models:[{name:'AR(1)',metrics:{rmse:null,rmse_delta}}]}});assert(html.includes('Unavailable'));assert(!/NaN|Infinity|undefined/.test(html));}
const tiny=render(BenchmarkVerdict,{result:{...result,models:[{name:'AR(1)',metrics:{rmse:.6,rmse_delta:-.045}}]}});assert(tiny.includes('-0.045%'));assert(!tiny.includes('-0.0%'));assert.equal(formatValidationDelta(-.00015),'-0.00015%');assert.equal(formatValidationDelta(-0),'0.0%');
assert(render(ValidationSummary,{result,series:'Treasury',horizon:6}).includes('24'));
const {ResearchChart}=load('src/components/research-chart.tsx'),chartProps={series:[{name:'Growth',points:[{date:'2026-08-31',value:-.2},{date:'2026-09-30',value:.4}]}]};
assert(!render(ResearchChart,chartProps).includes('research-current-label'));
assert(render(ResearchChart,{...chartProps,currentLabel:true}).includes('Current 0.40 · 2026-09-30'));
const {ContributionBars}=load('src/components/visual-research.tsx');
assert(render(ContributionBars,{rows:[{name:'Input',value:.2}]}).includes('σ'));
assert(!render(ContributionBars,{rows:[{name:'Input',value:.2}],unit:''}).includes('σ'));
const source=readFileSync('src/components/forecast-workspace.tsx','utf8');assert(source.includes('Naive benchmark'));assert(source.includes('<details className="canonical-fan">'));assert(source.includes('{m.metrics.n}'));
const analogue=readFileSync('src/app/focus/analogue/[date]/page.tsx','utf8');assert(analogue.includes('Small descriptive sample'));assert(analogue.includes('Signed cosine terms'));assert(analogue.includes('not news events'));assert(!analogue.includes('Expected return'));
console.log('Phase 4: matched-origin baseline display, tiny/null/nonfinite metrics, stored sample summary, opt-in current-value label, unchanged shared defaults, contribution units, secondary future forecast, transparent similarity and low-sample disclosures passed.');
