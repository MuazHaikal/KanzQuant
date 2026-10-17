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
const {equityNumber,equityPercent,equityMoney,equityMetric}=load('src/lib/equity-format.ts');
assert.equal(equityPercent(12.44),'+12.4%');assert.equal(equityPercent(-31.5),'-31.5%');
assert.equal(equityMetric('vol20',24.8),'24.8%');assert.equal(equityMetric('z20',-1.42),'-1.42');
assert.equal(equityMetric('momentum_percentile',92.3),'P92');assert.equal(equityMoney(24.3e9),'$24.3B');
assert.equal(equityMoney(812e6),'$812.0M');assert.equal(equityNumber(-.001),'0.00');
for(const v of [null,undefined,NaN,Infinity,-Infinity,'12'])for(const format of [equityNumber,equityPercent,equityMoney])assert.equal(format(v),'Unavailable');
function render(file,name,props){return renderToStaticMarkup(React.createElement(load(file)[name],props));}
const base={symbol:'TEST',name:'Test Company',sector:'Information Technology',features:{price:100,return_20:12.4,momentum_12_1:40,momentum_percentile:90,return_1:1},priceDate:'2026-10-14',fundamentals:[{date:'2026-03-31',filed_at:'2026-05-01',revenue:812e6,gross_margin:24,operating_margin:12,fcf:20e6},{date:'2026-06-30',filed_at:'2026-08-01',revenue:900e6,gross_margin:25,operating_margin:13,fcf:22e6}]};
for(const [file,name,props] of [['equities-discovery','EquitiesDiscovery',{rows:[base]}],['equity-screener','EquityScreener',{rows:[base]}],['equity-screener','EquityScreener',{rows:[]}],['equity-fundamental-trends','EquityFundamentalTrends',{stock:base}],['equity-fundamental-trends','EquityFundamentalTrends',{stock:{...base,sector:'Financials'}}],['equity-fundamental-trends','EquityFundamentalTrends',{stock:{...base,fundamentals:[]}}]]){
 const html=render('src/components/'+file+'.tsx',name,props);assert(!/NaN|Infinity|undefined|—%/.test(html),file);
 if(file==='equity-fundamental-trends'&&props.stock.sector==='Financials'){assert(!html.includes('Free cash flow'));assert(html.includes('not applicable'));}
 if(file==='equities-discovery'){assert(html.includes('+12.4%'));assert(html.includes('aria-sort="descending"'));assert(html.includes('Equity research workflow'));}
 if(file==='equity-screener'){assert(html.includes('screener-results-scroll'));assert(html.includes('All columns / dates'));assert(html.includes('Filters apply instantly'));}
}
const evidence={status:'Descriptive historical evidence',neighbours:[],outcomes:{'3m':{n:8,small_sample:true,values:[-5,2,4],median:2,mean:1,positive:66.7}}};
const html=render('src/components/equity-historical-evidence.tsx','EquityHistoricalEvidence',{evidence});assert(html.includes('Descriptive evidence'));assert(html.includes('n=8'));assert(html.includes('not calculated'));assert(!html.includes('Statistically significant'));
const css=readFileSync('src/app/phase-two.css','utf8');assert(css.includes('overflow:auto'));assert(!css.includes('--shell-bar:'));assert(!css.includes('.topbar{'));assert(!css.includes('.sidebar{'));
console.log('Phase 2: formatting/null/nonfinite/negative-zero, shared workflow, deterministic sort state, contained tables, empty results, real quarterly fundamentals, bank omissions and descriptive evidence contracts passed.');
