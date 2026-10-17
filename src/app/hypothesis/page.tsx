import {redirect} from "next/navigation";
export default async function LegacyHypothesis({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const p=await searchParams;const query=new URLSearchParams();for(const key of ["source","asset","horizon"])if(p[key])query.set(key,p[key]!);redirect("/evidence"+(query.size?"?"+query:""));}
