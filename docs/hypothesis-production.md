# Hypothesis production deployment

Vercel serves the existing Next.js app; Render Free runs only the canonical Python statistical engine; the existing Neon database stores queued/running/complete/failed runs and results. No schema migration, new database, queue, paid service or keep-alive traffic is required.

## Authentication boundary / deployment sequence

Do not deploy the frontend before the backend URL and shared secret are configured. A local successful test is not a public deployment.

1. Sign in to [Render Dashboard](https://dashboard.render.com/). If GitHub asks to authorize/install Render, grant only the required KanzQuant repository access yourself.
2. Publish the tested source to a release branch first (for example `codex/hypothesis-production`), not production main. Choose **New → Blueprint**, connect **MuazHaikal/KanzQuant**, select that published release branch and Blueprint path **render.yaml**. The service inherits the selected Blueprint branch, avoiding an early unconfigured Vercel production deployment.
3. Confirm only **kanzquant-hypothesis**, runtime **Python**, plan **Free**. Supply **DATABASE_URL** using the existing pooled Neon value and **HYPOTHESIS_RUN_SECRET** using the generated value in ignored `.env.local`. Do not paste either into chat or commit them. Do not independently generate a different Render secret.
4. Deploy. Copy the actual generated HTTPS service URL; do not assume its hostname. Open `<URL>/healthz`; expect `status=ok`, `service=kanzquant-hypothesis`, `version=0.2`.
5. Open Vercel → existing **kanz-quant** project → **Settings → Environment Variables**. Add Production **HYPOTHESIS_API_URL** = actual Render HTTPS URL (without an endpoint path), **HYPOTHESIS_RUN_SECRET** = same local/Render value, **HYPOTHESIS_EXECUTION_MODE** = `remote`. Leave **DATABASE_URL**, **FRED_API_KEY**, and **KANZQUANT_DATA_MODE** unchanged. Mark the shared secret sensitive where supported.
6. After Render health and Vercel configuration are verified, promote/merge the tested release to main and deploy the existing Vercel project. Switch the Render service/Blueprint to main for ongoing automatic deployments. On `https://kanz-quant.vercel.app/hypothesis`, run a conditional and a relationship test, inspect all result sections, refresh their saved URLs, and verify Credit → TEST THIS. Reopening completed results must work while Render is stopped/asleep.

If account sign-in is unavailable, keep the source deployment-ready locally and complete these steps after authentication. Do not push main merely to trigger an unconfigured frontend deploy.

## Local verification

Install `requirements-hypothesis-dev.txt` in the project Python 3.11 environment. `npm run hypothesis:configure` preserves existing `.env.local` values and generates a secret only when absent; `npm run hypothesis:api` starts the same service on port 8001. Next uses `HYPOTHESIS_EXECUTION_MODE=local` and `HYPOTHESIS_API_URL=http://127.0.0.1:8001`. Vercel explicitly rejects local mode; there is no local Python fallback.

Run Python tests, `npm run test:hypothesis`, existing focus/context/market integration tests, database verification, lint, typecheck and production build. `node --env-file=.env.local scripts/audit_secrets.mjs` checks source, git-history blobs, exact locally loaded credentials, credential-shaped values and built client assets without printing matched content.

## Operational contract

- Token: `v1.<expiry epoch seconds>.<base64url HMAC-SHA256>`, signing ASCII `kanzquant.hypothesis.v1\n<lowercase UUID>\n<expiry>`. Five-minute maximum lifetime, constant-time comparison. Authentication precedes run lookup.
- Execute accepts only `{run_id,token}`. Unknown fields/code/specifications are rejected. Canonical stored parameters are independently whitelisted; conditions ≤3; resamples fixed at 10,000 in the unchanged engine; dataset ≤1,200 monthly rows.
- Result and complete status are one atomic transaction tied to the execution claim. Duplicate calls cannot create a second result. Failures store only a generic reason; server exception logs are redacted.
- Browser polls before retrying execution. Cold request timeout 90 seconds, overall interaction bound four minutes; same-ID retries, no automatic duplicate preparation. UI uses PREPARING / STARTING RESEARCH ENGINE / RUNNING TEST based on actual state. Navigation aborts browser work, not the persisted statistical job.
- Free-service restart recovery uses a three-minute lease longer than the 60-second bounded compute process and database timeouts. Retry limits apply to actual claimed attempts, not network retries.
- Database: transaction-local 15-second statement / 5-second lock / 15-second idle-transaction limits compatible with Neon PgBouncer; connect/acquire 10 seconds; pool min 0/max 2. The single persistent compute child clears credentials before importing the scientific engine; it is terminated/replaced after a 60-second timeout. Library imports are reused on warm runs.
- Exact origin allowlist only; no wildcard or broad preview regex. Disable access logging so execution tokens are never logged. No public Swagger/OpenAPI or environment diagnostics.
- Recorded runtime describes data load and statistics before final persistence; execution response/logs include the actual complete write/commit and total execution timing. Next preparation is measured separately. Cold API startup is a separate measurement, not included in per-run compute.
- Saved old v0.2 results and fingerprints remain readable; one canonical research engine remains unchanged.

Render documents approximately one-minute Free cold starts after 15 idle minutes and possible restarts. This is a hobby deployment, not an availability SLA: [Render Free limitations](https://render.com/docs/free). Blueprint format and Python selection follow [Blueprint reference](https://render.com/docs/blueprint-spec) and [Python versions](https://render.com/docs/python-version).
