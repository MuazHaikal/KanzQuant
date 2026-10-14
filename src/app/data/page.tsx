import { PageHead, Panel } from "@/components/ui";
import { getSeriesCatalogue, isDatabaseMode } from "@/lib/database";

export default async function DataPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q = "", category = "ALL" } = await searchParams;
  const databaseSeries = await getSeriesCatalogue();
  const catalogue = databaseSeries.length ? databaseSeries : isDatabaseMode() ? (()=>{throw new Error("Database catalogue is empty; demo fallback is disabled in database mode")})() : (await import("@/lib/data")).series;
  const filtered = catalogue.filter(
    (item) =>
      (category === "ALL" || item.category === category) &&
      (item.name.toLowerCase().includes(q.toLowerCase()) ||
        item.externalId.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <>
      <PageHead
        section="System / Data"
        title="Research Data Catalogue"
        meta={`${filtered.length} OF ${catalogue.length} SERIES`}
      />
      <Panel
        title="Series registry"
        meta={databaseSeries.length ? "NEON · LIVE CATALOGUE" : "EXPLICIT DEMO CATALOGUE"}
        noPad
      >
        <form className="toolbar">
          <input
            className="control search"
            name="q"
            defaultValue={q}
            placeholder="Search series or identifier…"
            aria-label="Search series"
          />
          <select className="control" name="category" defaultValue={category} aria-label="Filter category">
            <option>ALL</option>
            {[...new Set(catalogue.map((item) => item.category))].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button className="control" type="submit">FILTER</button>
          <span className="panel-meta" style={{ marginLeft: "auto" }}>
            COMPOSITE PK · SERIES_ID + DATE
          </span>
        </form>
        <div className="catalogue">
          <table className="data-table">
            <thead>
              <tr>
                <th>Series / Identifier</th><th>Provider</th><th>Category</th><th>Frequency</th>
                <th>Start</th><th>End</th><th>Observations</th><th>Last updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}<small>{item.externalId}</small></td>
                  <td>{item.provider}</td><td>{item.category}</td><td>{item.frequency}</td>
                  <td>{item.start}</td><td>{item.end}</td>
                  <td>{item.observations.toLocaleString()}</td><td>{item.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="footer-note">
          VALUES RETAIN SOURCE FREQUENCY · RESEARCH ALIGNMENT OCCURS IN DERIVED FEATURE JOBS
        </div>
      </Panel>
    </>
  );
}
