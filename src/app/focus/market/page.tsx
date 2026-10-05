import { FocusShell } from "@/components/focus-shell";
import { ResearchChart } from "@/components/research-chart";
import { Panel,MethodologyDisclosure } from "@/components/ui";
import { getFocusData } from "@/lib/focus-data";
import { factorHistory,factors } from "@/lib/focus-math";
import { regimeColor } from "@/lib/research-data";
export default async function MarketPage(){
 const {snapshot:data,prices}=await getFocusData();
 return <FocusShell title="MARKET DETAIL / SPX & REGIMES" asOf={data.as_of} status={["SPX · PRICE INDEX","REGIME SHADING","MONTHLY"]}>
 <Panel title="S&P 500 / historical workspace" meta="DRAG TO PAN · ZOOM / RANGE CONTROLS" noPad><ResearchChart inspectDates={data.state_vectors!.filter(v=>v.date<data.as_of).map(v=>v.date)} initialStart={data.regime_history[0]?.date} height={350} series={[{name:"SPX",points:prices.SPX??[]}]} regimes={data.regime_history.map(r=>({date:r.date,color:regimeColor(r.label)}))}/><div className="regime-legend">{data.regime_stats.map(r=><span key={r.name} style={{color:regimeColor(r.name)}}>■ {r.name}</span>)}</div></Panel>
 <Panel title="Factor overlay inspection" meta="SELECT AXIS · SIGMA SCALE" noPad><ResearchChart inspectDates={data.state_vectors!.filter(v=>v.date<data.as_of).map(v=>v.date)} height={175} zero series={[{name:"Growth",points:factorHistory(data,"growth")},...factors.filter(f=>f!=="growth").map(f=>({name:"Overlay:"+f,points:factorHistory(data,f)}))]}/></Panel><MethodologyDisclosure/></FocusShell>;
}
