// Report only counts/paths, never matched text or credential values.
import {execFileSync} from "node:child_process";
import {readFileSync,existsSync,readdirSync,statSync} from "node:fs";
const git=(...args)=>execFileSync("git",args,{encoding:"utf8",maxBuffer:64*1024*1024,windowsHide:true});
const keys=["DATABASE_URL","FRED_API_KEY","HYPOTHESIS_RUN_SECRET","RENDER_API_KEY","VERCEL_TOKEN"];
const values=keys.map(k=>process.env[k]).filter(v=>v&&v.length>=12);
try{const password=decodeURIComponent(new URL(process.env.DATABASE_URL).password);if(password.length>=8)values.push(password);}catch{}
const issues=new Set();
function credentialUrl(content){
  // Minified libraries contain URL-parser fragments, not necessarily URLs.
  for(const match of content.matchAll(/postgres(?:ql)?:\/\/[^\s"'`<>{}();]+/gi)){
    try{const url=new URL(match[0]);if(url.username&&url.password&&url.hostname)return true;}catch{}
  }
  return false;
}
function inspect(content,path){if(values.some(v=>content.includes(v))||credentialUrl(content)||/(?:gh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(content))issues.add(path);}
const working=git("ls-files","--cached","--others","--exclude-standard").trim().split(/\r?\n/).filter(Boolean);
for(const path of working){if(existsSync(path))inspect(readFileSync(path,"utf8"),path);if(/^\.env(?:\.|$)/.test(path)&&path!==".env.example")issues.add(path);}
const history=git("rev-list","--objects","--all").trim().split(/\r?\n/).filter(Boolean);
let blobs=0;
for(const entry of history){const [id,...path]=entry.split(" ");if(git("cat-file","-t",id).trim()==="blob"){inspect(git("cat-file","blob",id),"history:"+path.join(" "));blobs++;}}
assertIgnored();
function assertIgnored(){try{git("check-ignore","--quiet",".env.local");}catch{issues.add(".env.local is not ignored");}}
let bundles=0;
function scan(dir){if(!existsSync(dir))return;for(const entry of readdirSync(dir)){const path=dir+"/"+entry;if(statSync(path).isDirectory())scan(path);else{inspect(readFileSync(path,"utf8"),"client-bundle:"+path);bundles++;}}}
scan(".next/static");
console.log(`Secret audit: ${working.length} source files, ${blobs} historical blobs, ${bundles} client assets; .env.local ignored; ${issues.size} findings.`);
if(issues.size){for(const path of issues)console.error(path);process.exitCode=1;}
