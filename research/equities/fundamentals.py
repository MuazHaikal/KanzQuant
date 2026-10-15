"""Conservative US-GAAP mapping; no restated values enter historical setup features."""
from datetime import date
import numpy as np

CONCEPTS={
 "revenue":["Revenues","SalesRevenueNet","RevenueFromContractWithCustomerExcludingAssessedTax","RevenueFromContractWithCustomerIncludingAssessedTax"],
 "gross_profit":["GrossProfit"],"operating_income":["OperatingIncomeLoss"],
 "net_income":["NetIncomeLoss","ProfitLoss"],
 "ocf":["NetCashProvidedByUsedInOperatingActivities"],
 "capex":["PaymentsToAcquirePropertyPlantAndEquipment"],
 "eps":["EarningsPerShareDiluted"],
 "cash":["CashAndCashEquivalentsAtCarryingValue"],
 "assets":["Assets"],"equity":["StockholdersEquity"],
 "shares":["CommonStockSharesOutstanding"],
}
INSTANT={"cash","assets","equity","shares"}
def _days(a,b):return (date.fromisoformat(b)-date.fromisoformat(a)).days

def normalize_companyfacts(payload,financial=False,as_of=None):
    as_of=as_of or date.today().isoformat()
    facts=payload.get("facts",{}).get("us-gaap",{})
    periods={}
    for metric,tags in CONCEPTS.items():
        if financial and metric=="revenue":tags=["RevenuesNetOfInterestExpense"]
        if financial and metric in {"gross_profit","ocf","capex"}:continue
        unit="USD/shares" if metric=="eps" else "shares" if metric=="shares" else "USD"
        # Prefer the first concept with recent usable coverage; never sum aliases.
        candidates=[]
        for tag in tags:
            rows=[r for r in facts.get(tag,{}).get("units",{}).get(unit,[]) if r.get("form") in {"10-Q","10-K","10-Q/A","10-K/A"} and r.get("filed","9999")<=as_of and r.get("end","9999")<=as_of]
            if rows:candidates.append((max(r["end"] for r in rows),-tags.index(tag),tag,rows))
        if not candidates:continue
        _,_,tag,rows=max(candidates,key=lambda r:r[:2])
        unique={}
        for r in sorted(rows,key=lambda r:r["filed"]):
            unique[(r.get("start"),r["end"])]=r
        rows=list(unique.values())
        for r in rows:
            value=None
            if metric in INSTANT:value=r["val"]
            elif r.get("start"):
                duration=_days(r["start"],r["end"])
                if 60<=duration<=110:value=r["val"]
                elif 140<=duration<=400 and metric!="eps":
                    prior=[p for p in rows if p.get("start")==r["start"] and 60<=_days(p["end"],r["end"])<=110]
                    if prior:value=r["val"]-max(prior,key=lambda p:p["end"])["val"]
            if value is None:continue
            entry=periods.setdefault(r["end"],{"date":r["end"],"filed_at":r["filed"],"concepts":{}})
            entry[metric]=float(value)
            entry["filed_at"]=max(entry["filed_at"],r["filed"])
            entry["concepts"][metric]={"tag":tag,"unit":unit,"filed":r["filed"],"accession":r.get("accn"),"source_cik":r.get("source_cik"),"derived":metric not in INSTANT and _days(r.get("start",r["end"]),r["end"])>110}
    result=sorted((p for p in periods.values() if any(k in p for k in ["revenue","net_income","ocf","eps"])),key=lambda p:p["date"])
    # Instant-only annual dates do not create invented quarterly flow periods.
    for i,p in enumerate(result):
        if p.get("ocf") is not None and p.get("capex") is not None:
            if p["capex"]>=0:p["fcf"]=p["ocf"]-p["capex"]
            else:p["capex"]=None  # unexpected signed outflow is ambiguous
        for num,label in [("gross_profit","gross_margin"),("operating_income","operating_margin"),("net_income","net_margin"),("fcf","fcf_margin"),("ocf","ocf_margin")]:
            p[label]=100*p[num]/p["revenue"] if p.get(num) is not None and p.get("revenue",0)>0 else None
        prior=[q for q in result[:i] if 330<=_days(q["date"],p["date"])<=400]
        for metric in ["revenue","eps","fcf"]:
            prev=prior[-1].get(metric) if prior else None
            p[metric+"_yoy"]=100*(p[metric]/prev-1) if prev is not None and prev>0 and p.get(metric) is not None else None
            if metric=="eps" and prior:
                current_accession=p["concepts"].get("eps",{}).get("accession")
                prior_accession=prior[-1]["concepts"].get("eps",{}).get("accession")
                if not current_accession or current_accession!=prior_accession:p["eps_yoy"]=None
        window=result[max(0,i-3):i+1]
        contiguous=len(window)==4 and all(60<=_days(window[j-1]["date"],window[j]["date"])<=110 for j in range(1,4))
        for metric in ["revenue","gross_profit","operating_income","net_income","ocf","fcf"]:
            p[metric+"_ttm"]=sum(q[metric] for q in window) if contiguous and all(q.get(metric) is not None for q in window) else None
        p["profitability_consistency"]=sum(q["net_income"]>0 for q in window)/4*100 if contiguous and all(q.get("net_income") is not None for q in window) else None
        p["ocf_consistency"]=sum(q["ocf"]>0 for q in window)/4*100 if contiguous and all(q.get("ocf") is not None for q in window) else None
        p["revenue_ttm_growth"]=None
        if i>=4 and 330<=_days(result[i-4]["date"],p["date"])<=400 and p.get("revenue_ttm") is not None and result[i-4].get("revenue_ttm",0):
            p["revenue_ttm_growth"]=100*(p["revenue_ttm"]/result[i-4]["revenue_ttm"]-1)
    return result
