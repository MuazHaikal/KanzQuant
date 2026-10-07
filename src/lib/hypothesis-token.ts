import "server-only";
import { createHmac } from "node:crypto";
export const TOKEN_LIFETIME = 300;
export function signingSecret() {
 const secret=process.env.HYPOTHESIS_RUN_SECRET;
 if(!secret||Buffer.byteLength(secret)<32)throw new Error("Research signing secret is not configured.");
 return secret;
}
// ASCII protocol, independent of TypeScript/Python JSON serialization.
export function signExecution(runId:string,expires:number,secret=signingSecret()) {
 if(!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/.test(runId)||!Number.isSafeInteger(expires))throw new Error("Invalid execution identity.");
 const signature=createHmac("sha256",secret).update(`kanzquant.hypothesis.v1\n${runId}\n${expires}`).digest("base64url");
 return `v1.${expires}.${signature}`;
}
export function executionEndpoint() {
 const mode=process.env.HYPOTHESIS_EXECUTION_MODE;
 const url=new URL(process.env.HYPOTHESIS_API_URL??"");
 const local=["localhost","127.0.0.1","[::1]"].includes(url.hostname);
 if(!["local","remote"].includes(mode??"")||url.username||url.password||url.search||url.hash||url.pathname!=="/"||(mode==="remote"&&(url.protocol!=="https:"||local))||(mode==="local"&&(!local||process.env.VERCEL)))throw new Error("Research API configuration is invalid.");
 return new URL("/v1/hypothesis/run",url).href;
}
