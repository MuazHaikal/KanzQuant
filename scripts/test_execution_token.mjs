// Test-only key supplied on stdin; never print a deployment credential.
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {createHmac} from "node:crypto";
const code=ts.transpileModule(readFileSync("src/lib/hypothesis-token.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};vm.runInNewContext(code,{exports,require:name=>name==="server-only"?{}:{createHmac},Buffer,URL,process:{env:{}}});
const input=JSON.parse(readFileSync(0,"utf8"));
process.stdout.write(exports.signExecution(input.run_id,input.expiry,input.secret));
