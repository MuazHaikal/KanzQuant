export type Point = { date: string; value: number };
export type Series = {
  id: string; externalId: string; name: string; shortName: string; category: string;
  frequency: string; unit: string; provider: string; start: string; end: string;
  observations: number; updated: string; latest: number; change1m: number; change3m: number;
  change12m: number; zscore: number; percentile: number; trend: "Rising" | "Falling" | "Stable"; data: Point[];
};
export type Analogue = { rank: number; date: string; similarity: number; regime: string; returns: number[]; growth: number; inflation: number; rates: number; credit: number };

const SERIES_CONFIG = [
  ["FEDFUNDS","Federal Funds Effective Rate","Fed Funds","Rates","Monthly","%",5.33],
  ["DGS2","2-Year Treasury Constant Maturity","US 2Y","Rates","Daily","%",4.62],
  ["DGS10","10-Year Treasury Constant Maturity","US 10Y","Rates","Daily","%",4.28],
  ["T10Y2Y","10Y minus 2Y Treasury Spread","10Y–2Y","Rates","Daily","pp",-0.34],
  ["CPIAUCSL","Consumer Price Index","CPI","Inflation","Monthly","Index",318.7],
  ["CPILFESL","Core Consumer Price Index","Core CPI","Inflation","Monthly","Index",325.1],
  ["PCEPI","PCE Price Index","PCE","Inflation","Monthly","Index",124.8],
  ["UNRATE","Civilian Unemployment Rate","Unemployment","Labour","Monthly","%",4.1],
  ["PAYEMS","All Employees: Total Nonfarm","Payrolls","Labour","Monthly","Thousands",159340],
  ["ICSA","Initial Claims","Jobless Claims","Labour","Weekly","Thousands",219],
  ["INDPRO","Industrial Production Index","Industrial Prod.","Growth","Monthly","Index",103.4],
  ["RSAFS","Advance Retail Sales","Retail Sales","Growth","Monthly","USD mn",704800],
  ["GDPC1","Real Gross Domestic Product","Real GDP","Growth","Quarterly","USD bn",22920],
  ["BAMLH0A0HYM2","ICE BofA US High Yield OAS","HY Spread","Credit","Daily","%",3.18],
  ["BAA10Y","Moody's BAA minus 10Y Treasury","BAA Spread","Credit","Daily","%",1.72],
  ["M2SL","M2 Money Stock","M2","Liquidity","Monthly","USD bn",21340],
  ["WALCL","Federal Reserve Total Assets","Fed Balance Sheet","Liquidity","Weekly","USD mn",6810000],
  ["SP500","S&P 500 Index","S&P 500","Markets","Daily","Index",5762.5],
  ["VIXCLS","CBOE Volatility Index","VIX","Markets","Daily","Index",18.6],
  ["GOLDAMGBD228NLBM","Gold Fixing Price","Gold","Markets","Daily","USD/oz",2652],
  ["DTWEXBGS","Trade Weighted US Dollar Index","US Dollar","Markets","Daily","Index",121.4],
] as const;

function seeded(i: number, j: number) {
  const x = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function monthDate(offset: number) {
  const d = new Date(Date.UTC(2008, offset, 1));
  return d.toISOString().slice(0, 7);
}

function makeHistory(index: number, endValue: number): Point[] {
  const points: Point[] = [];
  let value = endValue * ([8,11,15,16,17,19].includes(index) ? .55 : .82);
  for (let i = 0; i < 204; i++) {
    const cyclical = Math.sin((i + index * 3) / (10 + index % 5)) * endValue * .006;
    const shock = (i > 139 && i < 151 ? (index === 17 ? -.035 : index === 18 || index === 13 ? .06 : .01) : 0) * endValue;
    value += (endValue - value) * .016 + cyclical * .08 + (seeded(i,index) - .48) * Math.max(Math.abs(endValue) * .006, .03) + shock * .02;
    points.push({ date: monthDate(i), value: Number(value.toFixed(endValue > 10000 ? 0 : 2)) });
  }
  const scale = endValue / (points.at(-1)?.value || endValue);
  return points.map((p) => ({ ...p, value: Number((p.value * scale).toFixed(endValue > 10000 ? 0 : 2)) }));
}

export const series: Series[] = SERIES_CONFIG.map((s, i) => {
  const data = makeHistory(i, s[6]);
  const z = Number(((seeded(i,31) - .43) * 3.2).toFixed(2));
  const c1 = Number(((seeded(i,11) - .48) * (i === 17 ? 4.2 : 1.2)).toFixed(2));
  return {
    id: `s${i + 1}`, externalId: s[0], name: s[1], shortName: s[2], category: s[3], frequency: s[4], unit: s[5], provider: i >= 17 && i <= 19 ? "STOOQ" : "FRED",
    start: "2008-01", end: "2024-12", observations: s[4] === "Daily" ? 4278 + i * 7 : s[4] === "Weekly" ? 887 : s[4] === "Quarterly" ? 68 : 204,
    updated: "2025-01-03 14:20Z", latest: s[6], change1m: c1, change3m: Number((c1 * 2.3 + (seeded(i,7)-.5)).toFixed(2)),
    change12m: Number((c1 * 4.1 + (seeded(i,17)-.4)*3).toFixed(2)), zscore: z, percentile: Math.round(Math.min(98,Math.max(2,50+z*24))),
    trend: z > .25 ? "Rising" : z < -.25 ? "Falling" : "Stable", data,
  };
});

export const analogues: Analogue[] = [
  [1,"2017-09",94.2,"Expansion",2.1,5.7,9.4,18.1,.72,.16,-.31,-.44],
  [2,"1995-06",92.8,"Disinflation",3.4,8.2,12.5,24.7,.81,-.42,.18,-.61],
  [3,"2004-03",91.5,"Expansion",1.3,2.6,5.1,8.9,.48,.35,.61,-.22],
  [4,"2013-11",90.7,"Expansion",2.4,6.1,8.7,14.3,.66,.08,-.17,-.37],
  [5,"1986-08",89.9,"Disinflation",4.5,7.8,11.1,19.8,.29,-.61,.35,-.16],
  [6,"2019-04",88.6,"Late Cycle",-6.6,1.4,4.0,7.2,.18,.12,-.55,.07],
  [7,"2006-09",87.8,"Late Cycle",3.2,6.4,9.8,14.6,.44,.41,.26,.31],
  [8,"1992-02",86.9,"Recovery",1.0,4.7,6.9,10.8,.91,-.26,-.12,-.52],
  [9,"2021-08",85.4,"Inflation",-4.7,-2.1,-6.3,-11.2,.55,1.42,.88,.20],
  [10,"1983-05",84.7,"Recovery",5.1,8.9,13.5,20.4,1.18,-.73,.42,-.39],
].map((r) => ({rank:r[0] as number,date:r[1] as string,similarity:r[2] as number,regime:r[3] as string,returns:(r.slice(4,8) as number[]),growth:r[8] as number,inflation:r[9] as number,rates:r[10] as number,credit:r[11] as number}));

export const stateRows = [
  { label:"Growth", latest:"+1.8%", change:"+0.2", z:.72, percentile:78, trend:"Improving" },
  { label:"Inflation", latest:"2.7%", change:"−0.1", z:.16, percentile:54, trend:"Cooling" },
  { label:"Rates", latest:"4.28%", change:"+0.08", z:-.31, percentile:38, trend:"Stable" },
  { label:"Credit", latest:"318bp", change:"−12", z:-.44, percentile:27, trend:"Tight" },
  { label:"Liquidity", latest:"+3.1%", change:"+0.4", z:.38, percentile:64, trend:"Rising" },
  { label:"Volatility", latest:"18.6", change:"+1.2", z:.21, percentile:58, trend:"Normal" },
];

export const ticker = [
  ["SPX","5,762.48","+0.42%","up"],["US10Y","4.280","+3.1bp","down"],["US2Y","4.620","+1.8bp","down"],["10Y–2Y","−34bp","+1.3bp","warn"],
  ["VIX","18.60","−0.74","up"],["CPI YOY","2.70%","−0.10","up"],["UNRATE","4.10%","+0.10","warn"],["REGIME","EXPANSION","72%","up"],
];

export const regimes = [
  { name:"Expansion", code:"EX", color:"#28d7c0", months:68, avg:1.12, hit:68, volatility:3.7 },
  { name:"Disinflation", code:"DI", color:"#55bde5", months:49, avg:.86, hit:63, volatility:4.2 },
  { name:"Inflation", code:"IN", color:"#e2b66b", months:44, avg:.18, hit:52, volatility:5.8 },
  { name:"Stress", code:"ST", color:"#f27d7d", months:43, avg:-1.34, hit:34, volatility:8.9 },
];

export const regimeTimeline = Array.from({length: 96}, (_,i) => i > 68 && i < 77 ? 3 : i > 48 && i < 61 ? 2 : i % 17 < 5 ? 1 : 0);

export const runs = [
  {id:"KQ-0241",name:"Monthly Macro State",module:"MACRO.STATE",parameters:"24 features · 120m window",date:"2025-01-03 14:22",status:"complete",duration:"18.4s"},
  {id:"KQ-0240",name:"Historical Similarity",module:"MACRO.SIM",parameters:"cosine · gap=9m · k=10",date:"2025-01-03 14:22",status:"complete",duration:"4.2s"},
  {id:"KQ-0239",name:"Four-State Regime",module:"MACRO.REGIME",parameters:"PCA(5) · KMeans(4) · seed=42",date:"2025-01-03 14:21",status:"complete",duration:"7.8s"},
  {id:"KQ-0238",name:"Forward Return Matrix",module:"MARKET.FWD",parameters:"SPX · IEF · GLD · [1,3,6,12]m",date:"2025-01-03 14:21",status:"complete",duration:"3.1s"},
  {id:"KQ-0237",name:"FRED Incremental Update",module:"DATA.INGEST",parameters:"17 series · since 2024-12-01",date:"2025-01-03 14:20",status:"complete",duration:"11.7s"},
  {id:"KQ-0236",name:"Market Snapshot",module:"DATA.INGEST",parameters:"SPX · VIX · GOLD",date:"2025-01-03 14:20",status:"partial",duration:"6.9s"},
];

export const forwardSummary = [
  ["MEAN",1.24,4.73,7.47,12.76],["MEDIAN",2.25,5.90,8.90,14.45],["HIT RATE",80,80,80,90],["BEST",5.10,8.90,13.50,24.70],["WORST",-6.60,-2.10,-6.30,-11.20],["STDEV",3.72,3.36,5.41,9.31],
] as const;

export function getSeries(id?: string) { return series.find((s) => s.externalId === id) ?? series.find((s) => s.externalId === "CPIAUCSL")!; }
