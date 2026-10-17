import {notFound} from "next/navigation";
import {getHypothesisRun} from "@/lib/hypothesis-server";
import {StudyFocus} from "@/components/study-focus";
export default async function StudyPage({params}:{params:Promise<{id:string}>}){const {id}=await params;const run=await getHypothesisRun(id);if(!run)notFound();return <StudyFocus run={run}/>;}
