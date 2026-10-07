// Compatibility path: preparation only; never launches Python inside Vercel.
export { POST } from "../prepare/route";
export const runtime="nodejs";
export const maxDuration=60;
