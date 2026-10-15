-- Additive instrument extension: existing macro/index/ETF stores remain intact.
CREATE TABLE IF NOT EXISTS instruments (
 id uuid PRIMARY KEY REFERENCES assets(id), symbol text NOT NULL UNIQUE,
 name text NOT NULL, asset_type text NOT NULL CHECK(asset_type IN ('EQUITY','ETF','INDEX','COMMODITY','CRYPTO','RATE','MACRO_SERIES')),
 exchange text, currency text NOT NULL DEFAULT 'USD', country text,
 sector text, industry text, active boolean NOT NULL DEFAULT true,
 provider_ids jsonb NOT NULL DEFAULT '{}', memberships jsonb NOT NULL DEFAULT '[]',
 universe_date date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS equity_provider_cache (
 cache_key text PRIMARY KEY, payload jsonb NOT NULL, fetched_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS equity_fundamentals (
 instrument_id uuid NOT NULL REFERENCES instruments(id), period_end date NOT NULL,
 filed_at date NOT NULL, payload jsonb NOT NULL, source text NOT NULL DEFAULT 'SEC',
 PRIMARY KEY(instrument_id,period_end)
);
CREATE TABLE IF NOT EXISTS equity_feature_snapshots (
 instrument_id uuid NOT NULL REFERENCES instruments(id), as_of date NOT NULL,
 features jsonb NOT NULL, evidence jsonb NOT NULL, macro_context jsonb NOT NULL DEFAULT '{}',
 computed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(instrument_id,as_of)
);
CREATE INDEX IF NOT EXISTS equity_snapshots_date_idx ON equity_feature_snapshots(as_of DESC);
CREATE INDEX IF NOT EXISTS equity_fundamentals_date_idx ON equity_fundamentals(instrument_id,period_end DESC);
CREATE INDEX IF NOT EXISTS instruments_sector_idx ON instruments(sector) WHERE active;
