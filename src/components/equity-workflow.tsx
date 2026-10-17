import Link from "next/link";
export function EquityWorkflow({active}: {active: "discover" | "screen" | "research"}) {
  return <nav className="equity-workflow" aria-label="Equity research workflow"><Link href="/equities" aria-current={active === "discover" ? "page" : undefined}>Discover</Link><span aria-hidden="true">/</span><Link href="/equities/screener" aria-current={active === "screen" ? "page" : undefined}>Screen</Link>{active === "research" && <><span aria-hidden="true">/</span><span aria-current="page">Research</span></>}</nav>;
}
