CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  external_id text NOT NULL,
  name text NOT NULL,
  short_name text NOT NULL,
  category text NOT NULL,
  frequency text NOT NULL,
  unit text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);

CREATE TABLE IF NOT EXISTS observations (
  series_id uuid NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  observed_at date NOT NULL,
  value double precision NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (series_id, observed_at)
);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), symbol text NOT NULL UNIQUE,
  name text NOT NULL, asset_class text NOT NULL, provider text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_observations (
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE, observed_at date NOT NULL,
  open double precision, high double precision, low double precision, close double precision,
  adjusted_close double precision NOT NULL, volume bigint, ingested_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (asset_id, observed_at)
);

CREATE TABLE IF NOT EXISTS features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), series_id uuid REFERENCES series(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE, feature_key text NOT NULL,
  parameters jsonb NOT NULL DEFAULT '{}', metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((series_id IS NOT NULL)::int + (asset_id IS NOT NULL)::int = 1),
  UNIQUE NULLS NOT DISTINCT (series_id, asset_id, feature_key, parameters)
);

CREATE TABLE IF NOT EXISTS feature_values (
  feature_id uuid NOT NULL REFERENCES features(id) ON DELETE CASCADE, observed_at date NOT NULL,
  value double precision, PRIMARY KEY (feature_id, observed_at)
);

CREATE TABLE IF NOT EXISTS research_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), module text NOT NULL, name text NOT NULL,
  parameters jsonb NOT NULL DEFAULT '{}', status text NOT NULL CHECK (status IN ('queued','running','complete','partial','failed')),
  started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS research_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id uuid NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
  result_type text NOT NULL, result_key text NOT NULL, as_of_date date,
  payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(run_id, result_type, result_key)
);

CREATE TABLE IF NOT EXISTS regimes (
  run_id uuid NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE, observed_at date NOT NULL,
  regime_id smallint NOT NULL, label text NOT NULL, confidence double precision,
  metadata jsonb NOT NULL DEFAULT '{}', PRIMARY KEY (run_id, observed_at)
);

CREATE TABLE IF NOT EXISTS similarity_results (
  run_id uuid NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE, target_date date NOT NULL,
  neighbour_date date NOT NULL, rank smallint NOT NULL, score double precision NOT NULL,
  regime_label text, state_summary jsonb NOT NULL DEFAULT '{}', forward_returns jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (run_id, target_date, rank), UNIQUE(run_id, target_date, neighbour_date)
);

CREATE INDEX IF NOT EXISTS observations_date_idx ON observations(observed_at DESC);
CREATE INDEX IF NOT EXISTS market_observations_date_idx ON market_observations(observed_at DESC);
CREATE INDEX IF NOT EXISTS feature_values_date_idx ON feature_values(observed_at DESC);
CREATE INDEX IF NOT EXISTS research_runs_module_date_idx ON research_runs(module, started_at DESC);
CREATE INDEX IF NOT EXISTS research_results_lookup_idx ON research_results(result_type, as_of_date DESC);
CREATE INDEX IF NOT EXISTS regimes_date_idx ON regimes(observed_at DESC);
CREATE INDEX IF NOT EXISTS similarity_target_idx ON similarity_results(target_date DESC, score DESC);
