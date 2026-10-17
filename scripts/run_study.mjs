// Controlled research only: credentials remain in server headers, never output.
import {readFile} from "node:fs/promises";
const args=process.argv.slice(2),file=args.find(a=>!a.startsWith("--"));
if(!file){console.error("Usage: npm run evidence:run -- definitions.json [--refresh]");process.exit(1);}
async function main(){
 const origin=new URL(process.env.KANZQUANT_INTERNAL_URL??"http://127.0.0.1:3001");
 if(origin.username||origin.password||origin.pathname!=="/"||origin.search||origin.hash||!(origin.protocol==="https:"||origin.protocol==="http:"&&["localhost","127.0.0.1","[::1]"].includes(origin.hostname)))throw Error("Invalid internal origin");
 const secret=process.env.HYPOTHESIS_RUN_SECRET;if(!secret||Buffer.byteLength(secret)<32)throw Error("Missing internal credential");
 const input=JSON.parse(await readFile(file,"utf8")),definitions=Array.isArray(input)?input:[input];
 if(!definitions.length||definitions.length>100)throw Error("Use 1–100 approved definitions");
 for(const [i,definition] of definitions.entries()){
  const prepared=await fetch(new URL("/api/hypothesis/prepare",origin),{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${secret}`,...(!args.includes("--refresh")?{"X-KanzQuant-Reuse":"dataset"}:{})},body:JSON.stringify(definition),signal:AbortSignal.timeout(60000)});
  if(!prepared.ok)throw Error(`Study ${i+1}: preparation HTTP ${prepared.status}`);
  const capability=await prepared.json(),endpoint=new URL(capability.execution_url),configured=new URL(process.env.HYPOTHESIS_API_URL??"");
  if(endpoint.origin!==configured.origin||endpoint.pathname!=="/v1/hypothesis/run")throw Error("Unexpected execution destination");
  let complete=false;
  for(let attempt=0;attempt<12;attempt++){
   const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({run_id:capability.run_id,token:capability.execution_token}),signal:AbortSignal.timeout(90000)});
   if(!response.ok)throw Error(`Study ${i+1}: execution HTTP ${response.status}`);
   const result=await response.json();
   if(result.status==="complete"){complete=true;break;}
   if(result.status!=="running")throw Error(`Study ${i+1}: execution did not complete`);
   await new Promise(resolve=>setTimeout(resolve,5000));
  }
  if(!complete)throw Error(`Study ${i+1}: bounded execution wait expired`);
  console.log(`[${i+1}/${definitions.length}] Stored study ${capability.run_id} · /evidence/${capability.run_id}`);
  if(i<definitions.length-1)await new Promise(resolve=>setTimeout(resolve,5100));
 }
}
main().catch(error=>{console.error(error instanceof Error&&/^(Study \d+:|Invalid internal origin|Missing internal credential|Use 1–100|Unexpected execution destination)/.test(error.message)?error.message:"Internal research failed. Check configuration and the saved ledger; credentials are not logged.");process.exitCode=1;});
