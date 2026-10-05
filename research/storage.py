"""Thin Postgres persistence layer using COPY and set-based upserts."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone

import pandas as pd
import psycopg
from psycopg.rows import dict_row

def connect():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is required for database mode")
    return psycopg.connect(
        url,
        row_factory=dict_row,
        connect_timeout=10,
    )


def _set_local_timeouts(cur) -> None:
    """Neon pooled connections reject timeout startup parameters; set them per transaction."""
    cur.execute("SET LOCAL statement_timeout = '60s'")
    cur.execute("SET LOCAL lock_timeout = '10s'")
    cur.execute("SET LOCAL idle_in_transaction_session_timeout = '60s'")


def fred_ingestion_states(conn, external_ids: list[str]) -> dict[str, dict[str, object]]:
    """Fetch all incremental watermarks in one database round trip."""
    with conn.cursor() as cur:
        _set_local_timeouts(cur)
        cur.execute(
            """SELECT s.external_id,
                      max(o.observed_at) AS latest,
                      count(o.observed_at)::int AS observation_count,
                      COALESCE((s.metadata->>'fred_full_history_complete')::boolean, false) AS full_history_complete
               FROM series s
               LEFT JOIN observations o ON o.series_id=s.id
               WHERE s.provider='FRED' AND s.external_id = ANY(%s)
               GROUP BY s.id, s.external_id""",
            (external_ids,),
        )
        return {
            row["external_id"]: {
                "latest": row["latest"],
                "observation_count": row["observation_count"],
                "full_history_complete": row["full_history_complete"],
            }
            for row in cur.fetchall()
        }


def upsert_series_observations(conn, metadata, values, *, full_history: bool) -> dict[str, int]:
    """COPY one series into a temp table, then merge it with one SQL statement."""
    rows = [(timestamp.date(), float(value)) for timestamp, value in values.items()]
    if not rows:
        return {"attempted": 0, "changed": 0}
    try:
        with conn.cursor() as cur:
            _set_local_timeouts(cur)
            cur.execute(
                """INSERT INTO series(provider,external_id,name,short_name,category,frequency,unit)
                   VALUES('FRED',%(external_id)s,%(name)s,%(name)s,%(category)s,%(frequency)s,%(unit)s)
                   ON CONFLICT(provider,external_id) DO UPDATE SET
                     name=excluded.name,
                     category=excluded.category,
                     frequency=excluded.frequency,
                     unit=excluded.unit,
                     updated_at=now()
                   RETURNING id""",
                metadata.__dict__,
            )
            series_id = cur.fetchone()["id"]
            cur.execute(
                """CREATE TEMP TABLE IF NOT EXISTS fred_observation_stage (
                     observed_at date PRIMARY KEY,
                     value double precision NOT NULL
                   ) ON COMMIT DELETE ROWS"""
            )
            cur.execute("TRUNCATE fred_observation_stage")
            with cur.copy("COPY fred_observation_stage (observed_at, value) FROM STDIN") as copy:
                for row in rows:
                    copy.write_row(row)
            cur.execute(
                """INSERT INTO observations(series_id,observed_at,value)
                   SELECT %s, observed_at, value FROM fred_observation_stage
                   ON CONFLICT(series_id,observed_at) DO UPDATE SET
                     value=excluded.value,
                     ingested_at=now()
                   WHERE observations.value IS DISTINCT FROM excluded.value""",
                (series_id,),
            )
            changed = cur.rowcount
            marker = {
                "fred_last_successful_ingest": datetime.now(timezone.utc).isoformat(),
                "fred_full_history_complete": full_history,
            }
            cur.execute(
                """UPDATE series SET metadata=metadata || %s::jsonb, updated_at=now()
                   WHERE id=%s""",
                (json.dumps(marker), series_id),
            )
        conn.commit()
        return {"attempted": len(rows), "changed": changed}
    except Exception:
        conn.rollback()
        raise


def bulk_upsert_fred_observations(conn, datasets) -> dict[str, dict[str, int]]:
    """Persist every fetched series with one COPY and one set-based merge transaction."""
    if not datasets:
        return {}
    series_payload = [
        {
            "external_id": metadata.external_id,
            "name": metadata.name,
            "category": metadata.category,
            "frequency": metadata.frequency,
            "unit": metadata.unit,
            "full_history": bool(full_history),
        }
        for metadata, _, full_history in datasets
    ]
    attempted = {metadata.external_id: len(values) for metadata, values, _ in datasets}
    try:
        with conn.cursor() as cur:
            _set_local_timeouts(cur)
            payload = json.dumps(series_payload)
            cur.execute(
                """WITH input AS (
                     SELECT * FROM jsonb_to_recordset(%s::jsonb) AS x(
                       external_id text, name text, category text,
                       frequency text, unit text, full_history boolean
                     )
                   )
                   INSERT INTO series(provider,external_id,name,short_name,category,frequency,unit)
                   SELECT 'FRED',external_id,name,name,category,frequency,unit FROM input
                   ON CONFLICT(provider,external_id) DO UPDATE SET
                     name=excluded.name,
                     category=excluded.category,
                     frequency=excluded.frequency,
                     unit=excluded.unit,
                     updated_at=now()""",
                (payload,),
            )
            cur.execute(
                """CREATE TEMP TABLE fred_observation_batch (
                     external_id text NOT NULL,
                     observed_at date NOT NULL,
                     value double precision NOT NULL,
                     PRIMARY KEY(external_id, observed_at)
                   ) ON COMMIT DROP"""
            )
            with cur.copy(
                "COPY fred_observation_batch (external_id, observed_at, value) FROM STDIN"
            ) as copy:
                for metadata, values, _ in datasets:
                    for timestamp, value in values.items():
                        copy.write_row((metadata.external_id, timestamp.date(), float(value)))
            cur.execute(
                """WITH changed AS (
                     INSERT INTO observations(series_id,observed_at,value)
                     SELECT s.id, b.observed_at, b.value
                     FROM fred_observation_batch b
                     JOIN series s ON s.provider='FRED' AND s.external_id=b.external_id
                     ON CONFLICT(series_id,observed_at) DO UPDATE SET
                       value=excluded.value,
                       ingested_at=now()
                     WHERE observations.value IS DISTINCT FROM excluded.value
                     RETURNING series_id
                   )
                   SELECT s.external_id, count(*)::int AS changed
                   FROM changed c JOIN series s ON s.id=c.series_id
                   GROUP BY s.external_id"""
            )
            changed = {row["external_id"]: int(row["changed"]) for row in cur.fetchall()}
            cur.execute(
                """WITH input AS (
                     SELECT * FROM jsonb_to_recordset(%s::jsonb) AS x(
                       external_id text, name text, category text,
                       frequency text, unit text, full_history boolean
                     )
                   )
                   UPDATE series s SET
                     metadata=s.metadata || jsonb_build_object(
                       'fred_last_successful_ingest', %s::text,
                       'fred_full_history_complete', input.full_history
                     ),
                     updated_at=now()
                   FROM input
                   WHERE s.provider='FRED' AND s.external_id=input.external_id""",
                (payload, datetime.now(timezone.utc).isoformat()),
            )
        conn.commit()
        return {
            series_id: {"attempted": row_count, "changed": changed.get(series_id, 0)}
            for series_id, row_count in attempted.items()
        }
    except Exception:
        conn.rollback()
        raise


def count_fred_observations(conn, external_ids: list[str]) -> tuple[int, int]:
    with conn.cursor() as cur:
        _set_local_timeouts(cur)
        cur.execute(
            """SELECT count(DISTINCT s.id)::int AS series_count,
                      count(o.observed_at)::int AS observation_count
               FROM series s
               JOIN observations o ON o.series_id=s.id
               WHERE s.provider='FRED' AND s.external_id = ANY(%s)""",
            (external_ids,),
        )
        row = cur.fetchone()
        return int(row["series_count"]), int(row["observation_count"])


def market_ingestion_states(conn, symbols: list[str]) -> dict[str, dict[str, object]]:
    with conn.cursor() as cur:
        _set_local_timeouts(cur)
        cur.execute(
            """SELECT a.symbol, max(m.observed_at) AS latest,
                      count(m.observed_at)::int AS observation_count,
                      COALESCE((a.metadata->>'full_history_complete')::boolean, false) AS full_history_complete
               FROM assets a LEFT JOIN market_observations m ON m.asset_id=a.id
               WHERE a.symbol = ANY(%s)
               GROUP BY a.id, a.symbol""",
            (symbols,),
        )
        return {row["symbol"]: dict(row) for row in cur.fetchall()}


def bulk_upsert_market_observations(conn, provider: str, datasets) -> dict[str, dict[str, int]]:
    """COPY all assets into one staging table and merge in a single transaction."""
    if not datasets:
        return {}
    attempted = {asset.symbol: len(frame) for asset, frame, _ in datasets}
    assets = [
        {
            "symbol": asset.symbol,
            "name": asset.name,
            "asset_class": asset.asset_class,
            "provider_symbol": asset.provider_symbol,
            "description": asset.description,
            "full_history": bool(full_history),
        }
        for asset, _, full_history in datasets
    ]
    try:
        with conn.cursor() as cur:
            _set_local_timeouts(cur)
            cur.execute(
                """WITH input AS (
                     SELECT * FROM jsonb_to_recordset(%s::jsonb) AS x(
                       symbol text, name text, asset_class text, provider_symbol text,
                       description text, full_history boolean)
                   )
                   INSERT INTO assets(symbol,name,asset_class,provider,metadata)
                   SELECT symbol,name,asset_class,%s,
                          jsonb_build_object('provider_symbol',provider_symbol,'description',description)
                   FROM input
                   ON CONFLICT(symbol) DO UPDATE SET name=excluded.name,
                     asset_class=excluded.asset_class, provider=excluded.provider,
                     metadata=assets.metadata || excluded.metadata""",
                (json.dumps(assets), provider),
            )
            cur.execute(
                """CREATE TEMP TABLE market_observation_batch (
                     symbol text NOT NULL, observed_at date NOT NULL,
                     open double precision, high double precision, low double precision,
                     close double precision, adjusted_close double precision NOT NULL, volume bigint,
                     PRIMARY KEY(symbol, observed_at)
                   ) ON COMMIT DROP"""
            )
            with cur.copy(
                "COPY market_observation_batch (symbol,observed_at,open,high,low,close,adjusted_close,volume) FROM STDIN"
            ) as copy:
                for asset, frame, _ in datasets:
                    for timestamp, row in frame.iterrows():
                        def finite(value):
                            return None if pd.isna(value) else float(value)
                        volume = None if pd.isna(row["volume"]) else int(row["volume"])
                        copy.write_row((
                            asset.symbol, timestamp.date(), finite(row["open"]), finite(row["high"]),
                            finite(row["low"]), finite(row["close"]), float(row["adjusted_close"]), volume,
                        ))
            cur.execute(
                """WITH changed AS (
                     INSERT INTO market_observations(
                       asset_id,observed_at,open,high,low,close,adjusted_close,volume)
                     SELECT a.id,b.observed_at,b.open,b.high,b.low,b.close,b.adjusted_close,b.volume
                     FROM market_observation_batch b JOIN assets a ON a.symbol=b.symbol
                     ON CONFLICT(asset_id,observed_at) DO UPDATE SET
                       open=excluded.open, high=excluded.high, low=excluded.low, close=excluded.close,
                       adjusted_close=excluded.adjusted_close, volume=excluded.volume, ingested_at=now()
                     WHERE (market_observations.open,market_observations.high,market_observations.low,
                            market_observations.close,market_observations.adjusted_close,market_observations.volume)
                       IS DISTINCT FROM
                           (excluded.open,excluded.high,excluded.low,excluded.close,
                            excluded.adjusted_close,excluded.volume)
                     RETURNING asset_id
                   )
                   SELECT a.symbol,count(*)::int AS changed
                   FROM changed c JOIN assets a ON a.id=c.asset_id GROUP BY a.symbol"""
            )
            changed = {row["symbol"]: int(row["changed"]) for row in cur.fetchall()}
            cur.execute(
                """WITH input AS (
                     SELECT * FROM jsonb_to_recordset(%s::jsonb) AS x(
                       symbol text, name text, asset_class text, provider_symbol text,
                       description text, full_history boolean)
                   )
                   UPDATE assets a SET metadata=a.metadata || jsonb_build_object(
                     'last_successful_ingest',%s::text,'full_history_complete',input.full_history)
                   FROM input WHERE a.symbol=input.symbol""",
                (json.dumps(assets), datetime.now(timezone.utc).isoformat()),
            )
        conn.commit()
        return {symbol: {"attempted": rows, "changed": changed.get(symbol, 0)} for symbol, rows in attempted.items()}
    except Exception:
        conn.rollback()
        raise


def count_market_observations(conn, symbols: list[str]) -> tuple[int, int]:
    with conn.cursor() as cur:
        _set_local_timeouts(cur)
        cur.execute(
            """SELECT count(DISTINCT a.id)::int AS assets, count(m.observed_at)::int AS observations
               FROM assets a JOIN market_observations m ON m.asset_id=a.id
               WHERE a.symbol = ANY(%s)""",
            (symbols,),
        )
        row = cur.fetchone()
        return int(row["assets"]), int(row["observations"])


def load_research_inputs(conn, series_ids: list[str], asset_symbols: list[str]):
    """Load all macro and market inputs with two bulk queries."""
    with conn.cursor() as cur:
        _set_local_timeouts(cur)
        cur.execute(
            """SELECT s.external_id,s.frequency,o.observed_at,o.value
               FROM series s JOIN observations o ON o.series_id=s.id
               WHERE s.provider='FRED' AND s.external_id = ANY(%s)
               ORDER BY s.external_id,o.observed_at""",
            (series_ids,),
        )
        macro_rows = cur.fetchall()
        cur.execute(
            """SELECT a.symbol,m.observed_at,m.adjusted_close
               FROM assets a JOIN market_observations m ON m.asset_id=a.id
               WHERE a.symbol = ANY(%s) ORDER BY a.symbol,m.observed_at""",
            (asset_symbols,),
        )
        market_rows = cur.fetchall()
    macro = pd.DataFrame(macro_rows)
    market = pd.DataFrame(market_rows)
    return macro, market


def save_research_run(payload: dict, assignments: pd.DataFrame, labels: dict[int, str], neighbours: list[dict]):
    """Atomically persist the snapshot, regime history, state vectors and neighbours."""
    with connect() as conn:
        try:
            with conn.cursor() as cur:
                _set_local_timeouts(cur)
                cur.execute(
                    """INSERT INTO research_runs(module,name,parameters,status,metadata)
                       VALUES('macro.research','Real monthly macro state, regimes and similarity',%s,'running',%s)
                       RETURNING id""",
                    (json.dumps(payload["methodology"]), json.dumps({"engine": "python", "data_mode": "database"})),
                )
                run_id = cur.fetchone()["id"]
                results = [
                    ("snapshot", "latest", payload["as_of"], payload),
                    ("state_vectors", "monthly", payload["as_of"], {"rows": payload["state_vectors"], "features": payload["features"]}),
                    ("methodology", "v1", payload["as_of"], payload["methodology"]),
                ]
                for result_type, key, as_of, result_payload in results:
                    cur.execute(
                        """INSERT INTO research_results(run_id,result_type,result_key,as_of_date,payload)
                           VALUES(%s,%s,%s,%s,%s)""",
                        (run_id, result_type, key, as_of, json.dumps(result_payload, allow_nan=False)),
                    )
                with cur.copy(
                    "COPY regimes (run_id,observed_at,regime_id,label,confidence,metadata) FROM STDIN"
                ) as copy:
                    for observed_at, row in assignments.iterrows():
                        copy.write_row((run_id, observed_at.date(), int(row["regime_id"]), labels[int(row["regime_id"])], float(row["confidence"]), "{}"))
                with cur.copy(
                    "COPY similarity_results (run_id,target_date,neighbour_date,rank,score,regime_label,state_summary,forward_returns) FROM STDIN"
                ) as copy:
                    for row in neighbours:
                        copy.write_row((run_id, payload["as_of"], row["date"], row["rank"], row["similarity"], row["regime"], json.dumps(row["state"]), json.dumps(row["returns"])))
                cur.execute(
                    "UPDATE research_runs SET status='complete',completed_at=now(),metadata=metadata || %s::jsonb WHERE id=%s",
                    (json.dumps({"state_months": len(payload["state_vectors"]), "features": len(payload["features"])}), run_id),
                )
            conn.commit()
            return run_id
        except Exception:
            conn.rollback()
            raise


def save_research_snapshot(payload):
    with connect() as conn, conn.cursor() as cur:
        _set_local_timeouts(cur)
        cur.execute(
            """INSERT INTO research_runs(module,name,parameters,status,completed_at,metadata)
               VALUES('macro.similarity','Monthly macro state + similarity',%s,'complete',now(),%s)
               RETURNING id""",
            (
                json.dumps({"metric": "cosine", "k": 10, "min_gap_months": 9, "seed": 42}),
                json.dumps({"engine": "python"}),
            ),
        )
        run_id = cur.fetchone()["id"]
        cur.execute(
            """INSERT INTO research_results(run_id,result_type,result_key,as_of_date,payload)
               VALUES(%s,'snapshot','latest',%s,%s)""",
            (run_id, payload["as_of"], json.dumps(payload)),
        )
    return run_id
