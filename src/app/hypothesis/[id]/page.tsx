import {redirect} from "next/navigation";
export default async function LegacyStudy({params}:{params:Promise<{id:string}>}){const {id}=await params;redirect("/evidence/"+encodeURIComponent(id));}
