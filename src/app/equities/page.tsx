import {equityList} from "@/lib/equities";
import {EquitiesDiscovery} from "@/components/equities-discovery";
export default async function Equities(){return <EquitiesDiscovery rows={await equityList()}/>;}
