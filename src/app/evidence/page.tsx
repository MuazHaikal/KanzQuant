import {EvidenceLibrary} from "@/components/evidence-library";
import {getEvidenceStudies} from "@/lib/evidence-data";
export default async function EvidencePage({searchParams}: {searchParams: Promise<{source?:string;asset?:string;theme?:string;horizon?:string}>}) {
  const [studies, query] = await Promise.all([getEvidenceStudies(), searchParams]);
  const theme = query.theme ?? (query.source ? query.source[0].toUpperCase()+query.source.slice(1) : "");
  return <EvidenceLibrary studies={studies} initial={{theme, asset: query.asset ?? "", horizon: query.horizon ?? ""}}/>;
}
