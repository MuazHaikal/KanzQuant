import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {createRequire} from "node:module";
import ts from "typescript";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
const require=createRequire(import.meta.url);
function load(path){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require,Date,Math,Number,Set});return exports;}
const {ModelComparison}=load("src/components/model-comparison.tsx"),{ForecastPlot}=load("src/components/forecast-charts.tsx");
const html=renderToStaticMarkup(React.createElement(ModelComparison,{models:[{name:"Naive",status:"complete",metrics:{n:24,mae:.4,rmse:.5}},{name:"ARIMA",status:"MODEL FIT FAILED",metrics:{n:0,mae:null,rmse:null}}]}));
assert(html.includes("lower is better"));assert(html.includes("MODEL FIT FAILED"));assert(html.includes("Unavailable"));assert(!html.includes("NaN"));
const chart=renderToStaticMarkup(React.createElement(ForecastPlot,{title:"Forecast range",interval:true,boundary:"2026-09-30",layers:[{name:"Observed",points:[{date:"2026-09-30",value:1}]},{name:"Forecast",points:[{date:"2026-09-30",value:1,lower:1,upper:1},{date:"2026-10-31",value:2,lower:0,upper:4}]}]}));assert(chart.includes("Arrow keys inspect dates"));assert(chart.includes("FORECAST ORIGIN"));assert(chart.includes('opacity=".15"'));assert(chart.includes('tabindex="0"'));
console.log("Forecast comparison handles failed/missing metrics; one-step forecast fan, origin marker, and accessible keyboard chart render correctly.");
