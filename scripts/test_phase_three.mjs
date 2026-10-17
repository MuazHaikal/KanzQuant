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
const {ExplorerResearchRail,ExplorerAnalytics}=load('src/components/explorer-research-rail.tsx');
const context={asOf:'2026-09-30',state:'Inflation',strength:95.8,factors:[{name:'rates',percentile:90},{name:'inflation',percentile:12},{name:'liquidity',percentile:null}],neighbours:[{date:'2008-09-30',similarity:.88,state:'Stress',returns:{SPX:{'3m':-12.4},GLD:{'3m':4.2}}}]};
const render=(component,props)=>renderToStaticMarkup(React.createElement(component,props));
for(const [id,type,expected] of [['SPX','market','-12.4%'],['GLD','market','+4.2%'],['IEF','market','Unavailable'],['DGS10','macro','-12.4%']]){
 const html=render(ExplorerResearchRail,{context,main:{id,type},points:[],date:'2026-09-30'});
 assert(html.includes(expected),id);assert(html.includes('88.0%'));assert(html.includes('/focus/analogue/2008-09-30'));
 assert(html.includes('not probability'));assert(!/NaN|Infinity|undefined/.test(html));
 assert(!html.includes('Last price'));assert.equal(html.includes('Quant Snapshot'),type==='market');
}
const empty=render(ExplorerAnalytics,{context:{...context,neighbours:[]},asset:'SPX',points:[]});
assert(empty.includes('N=0'));assert(!/NaN|Infinity|undefined/.test(empty));
const source=readFileSync('src/components/chart-explorer.tsx','utf8');
assert(source.includes('Remove ')&&source.includes('Add '));assert(source.includes('Last visible observation'));
// SVG title text must be a single child: split literal/expression text can hydrate differently.
assert(source.includes('<title>{`Last visible observation · ${last.date}`}</title>'));
assert(source.includes('Math.min(460,size.height-480)'));
const overview=readFileSync('src/app/page.tsx','utf8');
assert(overview.includes('c.moves.map'));assert(overview.includes('Composite level · axis units'));
const css=readFileSync('src/app/phase-three.css','utf8');
assert(css.includes('.canonical-explorer'));assert(css.includes('.canonical-overview'));
assert(!css.includes('--shell-bar:'));assert(!css.includes('.topbar{'));assert(!css.includes('.sidebar{'));
console.log('Phase 3: real asset-specific analogue outcomes, unavailable/empty states, descriptive similarity, no duplicate price, contained chart annotation, factor level/change separation and scoped styling passed.');
