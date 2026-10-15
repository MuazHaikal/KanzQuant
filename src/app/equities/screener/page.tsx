import {equityList} from "@/lib/equities";
import {EquityScreener} from "@/components/equity-screener";
export default async function Screener(){return <EquityScreener rows={await equityList()}/>;}
