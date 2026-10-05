import { FocusShell } from "@/components/focus-shell";
import { MarketChart } from "@/components/market-chart";
import { getMarketWindow } from "@/lib/market-data";
import { assets, type Asset } from "@/lib/market-math";
import { ResearchChart } from "@/components/research-chart";
import { Panel,MethodologyDisclosure } from "@/components/ui";
import { getFocusData } from "@/lib/focus-data";
import { factorHistory,factors } from "@/lib/focus-math";
import { regimeColor } from "@/lib/research-data";
export default async function MarketPage({searchParams}:{searchParams:Promise<{asset?:string}>}){
 const query=await searchParams,asset=assets.includes(query.asset as Asset)?query.asset as Asset:"SPX";
 const [{snapshot:data},market]=await Promise.all([getFocusData(),getMarketWindow(asset)]);
 return <FocusShell title="Market history" asOf={data.as_of} status={["Persisted daily OHLC","Raw market prices"]}>
 <Panel title="Market inspection" meta={`Latest market data ${market.latest}`} noPad><MarketChart initial={market} initialAsset={asset} height="clamp(420px, calc(100vh - 380px), 700px)" regimes={data.regime_history.map(r=>({date:r.date,label:r.label,color:regimeColor(r.label)}))}/></Panel>
 <details className="market-support"><summary>Factor context · line charts</summary><Panel title="Factor overlay inspection" meta="SEMANTIC AXES · SIGMA SCALE" noPad><ResearchChart height={175} zero series={[{name:"Growth",points:factorHistory(data,"growth")},...factors.filter(f=>f!=="growth").map(f=>({name:"Overlay:"+f,points:factorHistory(data,f)}))]}/></Panel></details><MethodologyDisclosure/></FocusShell>;
}
