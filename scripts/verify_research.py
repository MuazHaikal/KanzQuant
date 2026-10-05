from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from research.config import load_local_env
from research.storage import connect


def main() -> int:
    load_local_env()
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT a.symbol,min(m.observed_at) AS start_date,max(m.observed_at) AS end_date,
                      count(*)::int AS observations
               FROM assets a JOIN market_observations m ON m.asset_id=a.id
               GROUP BY a.symbol ORDER BY a.symbol"""
        )
        assets = cur.fetchall()
        assert {row["symbol"] for row in assets} >= {"SPX", "GLD", "IEF"}
        cur.execute(
            """SELECT count(*)::int AS duplicates FROM (
                 SELECT asset_id,observed_at FROM market_observations
                 GROUP BY asset_id,observed_at HAVING count(*) > 1) x"""
        )
        assert cur.fetchone()["duplicates"] == 0
        cur.execute(
            """SELECT r.id,r.status,rr.payload
               FROM research_runs r JOIN research_results rr ON rr.run_id=r.id
               WHERE r.module='macro.research' AND r.status='complete'
                 AND rr.result_type='snapshot' AND rr.result_key='latest'
               ORDER BY r.completed_at DESC LIMIT 1"""
        )
        latest = cur.fetchone()
        assert latest is not None
        payload = latest["payload"]
        assert payload["methodology"]["data_mode"] == "database"
        assert len(payload["features"]) == 19 and len(payload["state_vectors"]) >= 120
        cur.execute("SELECT count(*)::int AS n FROM regimes WHERE run_id=%s", (latest["id"],))
        assert cur.fetchone()["n"] == len(payload["state_vectors"])
        cur.execute(
            """SELECT target_date,neighbour_date,rank,score FROM similarity_results
               WHERE run_id=%s ORDER BY rank""",
            (latest["id"],),
        )
        neighbours = cur.fetchall()
        assert len(neighbours) == 10
        assert all(-1 <= row["score"] <= 1 and row["neighbour_date"] < row["target_date"] for row in neighbours)
        months = [row["neighbour_date"].year * 12 + row["neighbour_date"].month for row in neighbours]
        assert all(abs(a - b) >= 9 for index, a in enumerate(months) for b in months[index + 1 :])
        cur.execute(
            """SELECT count(*)::int AS duplicates FROM (
                 SELECT series_id,observed_at FROM observations
                 GROUP BY series_id,observed_at HAVING count(*) > 1) x"""
        )
        assert cur.fetchone()["duplicates"] == 0
    for row in assets:
        print(f"{row['symbol']}: {row['start_date']} -> {row['end_date']} ({row['observations']:,} observations)")
    print(f"Latest real research run: {latest['id']} | states={len(payload['state_vectors'])} | analogues={len(neighbours)}")
    print("Integrity: no duplicates, scores bounded, no future neighbours, temporal gaps valid, database provenance valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
