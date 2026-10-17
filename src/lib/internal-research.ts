import "server-only";
import {timingSafeEqual} from "node:crypto";
/** Existing server-side signing credential; never included in browser props. */
export function internalResearchRequest(request: Request) {
  const expected=process.env.HYPOTHESIS_RUN_SECRET;
  const supplied=request.headers.get("authorization")?.replace(/^Bearer /,"");
  if (!expected || expected.length<32 || !supplied || supplied.length>512) return false;
  const a=Buffer.from(supplied),b=Buffer.from(expected);
  return a.length===b.length && timingSafeEqual(a,b);
}
