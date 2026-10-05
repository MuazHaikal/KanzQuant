"""Apply and verify the KanzQuant Neon schema without exposing credentials."""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
import uuid

import psycopg

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from research.config import load_local_env

MIGRATION = ROOT / "migrations" / "001_initial.sql"

EXPECTED_TABLES = {
    "series", "observations", "assets", "market_observations", "features",
    "feature_values", "research_runs", "research_results", "regimes", "similarity_results",
}
EXPECTED_INDEXES = {
    "observations_date_idx", "market_observations_date_idx", "feature_values_date_idx",
    "research_runs_module_date_idx", "research_results_lookup_idx", "regimes_date_idx",
    "similarity_target_idx",
}
EXPECTED_CONSTRAINTS = {
    "series_pkey", "series_provider_external_id_key", "observations_pkey",
    "observations_series_id_fkey", "assets_pkey", "assets_symbol_key",
    "market_observations_pkey", "market_observations_asset_id_fkey", "features_pkey",
    "features_series_id_fkey", "features_asset_id_fkey", "features_check",
    "features_series_id_asset_id_feature_key_parameters_key", "feature_values_pkey",
    "feature_values_feature_id_fkey", "research_runs_pkey", "research_runs_status_check",
    "research_results_pkey", "research_results_run_id_fkey",
    "research_results_run_id_result_type_result_key_key", "regimes_pkey",
    "regimes_run_id_fkey", "similarity_results_pkey", "similarity_results_run_id_fkey",
    "similarity_results_run_id_target_date_neighbour_date_key",
}


def verify_schema(conn: psycopg.Connection) -> dict[str, object]:
    with conn.cursor() as cur:
        cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")
        tables = {row[0] for row in cur.fetchall()}
        cur.execute("SELECT indexname FROM pg_indexes WHERE schemaname='public'")
        indexes = {row[0] for row in cur.fetchall()}
        cur.execute("""SELECT c.conname, c.contype FROM pg_constraint c
                       JOIN pg_class r ON r.oid=c.conrelid
                       JOIN pg_namespace n ON n.oid=r.relnamespace
                       WHERE n.nspname='public' AND r.relname = ANY(%s)""", (list(EXPECTED_TABLES),))
        constraints = {row[0]: row[1] for row in cur.fetchall()}
        cur.execute("SELECT extname FROM pg_extension WHERE extname='pgcrypto'")
        pgcrypto = cur.fetchone() is not None
    missing_tables = EXPECTED_TABLES - tables
    missing_indexes = EXPECTED_INDEXES - indexes
    missing_constraints = EXPECTED_CONSTRAINTS - constraints.keys()
    if missing_tables or missing_indexes or missing_constraints or not pgcrypto:
        raise RuntimeError(
            f"Schema verification failed: tables={sorted(missing_tables)}, "
            f"indexes={sorted(missing_indexes)}, constraints={sorted(missing_constraints)}, pgcrypto={pgcrypto}"
        )
    expected_types = {"p": 10, "u": 5, "f": 8, "c": 2}
    actual_types = {kind: sum(value == kind for value in constraints.values()) for kind in expected_types}
    structural_count = sum(actual_types.values())
    if actual_types != expected_types or structural_count != len(EXPECTED_CONSTRAINTS):
        raise RuntimeError(f"Unexpected constraint inventory: {actual_types}, total={len(constraints)}")
    return {
        "tables": sorted(EXPECTED_TABLES),
        "indexes": sorted(EXPECTED_INDEXES),
        "constraints": len(constraints),
        "not_null": sum(kind == "n" for kind in constraints.values()),
        "foreign_keys": sum(kind == "f" for kind in constraints.values()),
        "checks": sum(kind == "c" for kind in constraints.values()),
        "pgcrypto": pgcrypto,
    }


def transactional_read_write_probe(conn: psycopg.Connection) -> None:
    probe_id = uuid.uuid4()
    try:
        with conn.cursor() as cur:
            cur.execute("""INSERT INTO research_runs(id,module,name,parameters,status,metadata)
                           VALUES(%s,'system.probe','Neon integration probe','{}','complete','{}')""", (probe_id,))
            cur.execute("SELECT module, status FROM research_runs WHERE id=%s", (probe_id,))
            row = cur.fetchone()
            if row != ("system.probe", "complete"):
                raise RuntimeError("Read/write probe returned unexpected data")
        conn.rollback()
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM research_runs WHERE id=%s", (probe_id,))
            if cur.fetchone()[0] != 0:
                raise RuntimeError("Read/write probe rollback did not remove the test row")
    except Exception:
        conn.rollback()
        raise


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()
    load_local_env(ROOT)
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not configured")
    if os.getenv("KANZQUANT_DATA_MODE") != "database":
        raise RuntimeError("KANZQUANT_DATA_MODE must be set to database")
    with psycopg.connect(url) as conn:
        if not args.verify_only:
            conn.execute(MIGRATION.read_text(encoding="utf-8"), prepare=False)
            conn.commit()
            print("Migration applied successfully.")
        result = verify_schema(conn)
        transactional_read_write_probe(conn)
    print(f"Verified {len(result['tables'])} tables, {len(result['indexes'])} named indexes, "
          f"{result['constraints']} constraints ({result['foreign_keys']} foreign keys, "
          f"{result['checks']} checks, {result['not_null']} not-null), pgcrypto={result['pgcrypto']}.")
    print("Transactional Neon read/write probe passed and was rolled back.")
    print("Tables: " + ", ".join(result["tables"]))


if __name__ == "__main__":
    main()
