# Hypothesis service verification — 2026-10-07

Status: **publicly deployed and verified**. Render Free `kanzquant-hypothesis` at `https://kanzquant-hypothesis.onrender.com` serves the Python API. Existing Vercel project `kanz-quant` serves `https://kanz-quant.vercel.app/hypothesis`. Source commit `74382db` was staged on `codex/hypothesis-production`, then fast-forwarded to main after public Render health and Vercel Production configuration passed. Existing Neon/FRED variables were preserved. Credentials were provisioned privately after explicit user approval.

## Public production verification

- Public `/healthz`: HTTP 200, `{status:ok, service:kanzquant-hypothesis, version:0.2}`. Render deployment succeeded in 1m03s; Vercel production build Ready in 28s.
- Real public prepare → signed Render execution → Neon → saved public result: conditional/relationship, all assets, AND, all horizons through robustness, null/small samples, exact reproduction/reopening, family FDR and concurrent duplicate execution passed. Each successful concurrent run has one attempt and one result. Raw macro/market data and source research runs unchanged.
- Public unsigned/invalid/expired/tampered/swapped/unknown/code/origin rejection passed. Failed verification run `b06e450b-6a2f-429d-861d-276a050340be` recovered with the same ID, two attempts, one result; health remained good. Only this new verification row's dataset reference was temporarily modified and restored.
- Browser conditional `678ff0ee-80b2-460e-8e39-92977c221774`: N=38; all five result sections and saved URL refresh passed. Browser relationship `0712c340-5230-46d1-9926-c84230ae3c05`: N=39, complete. Production browser console clean. Credit → TEST THIS run `2709af63-acc5-41ab-8b25-fa62a24c0c09` preserves the prefill and returns honest insufficient-sample N=0. The queued fixture left by the clock-skew test was renewed/executed successfully, not deleted.
- First Render computation: prepare 1.898s; dataset load 0.498s; statistics/worker 10.346s; result write 0.300s; total execution 11.780s. Warm relationship: prepare 1.018s, statistics 0.956s, write 0.342s, execution 1.545s. Warm conditional: prepare 0.332s, statistics 1.676s, write 0.296s, execution 2.266s. These are API execution timings, not browser delivery or a measured idle-service wake-up.
- Local and remote clocks differed by approximately three seconds. Remote integration fixtures now use an expiry 600s in the past and a valid unknown-run token 240s ahead; exact expiry boundaries remain covered with an injected Python clock. No service token policy changed.
- Repeated 50 Python tests, ESLint, TypeScript, client-state tests, database verification, and public market/context/Focus suites passed. No schema migration, paid resources or keep-awake traffic.

## Verified architecture

Production-built Next.js on port 3001 → browser/direct FastAPI on port 8001 → existing real Neon database → saved Next result page. The statistical engine is unchanged. The existing schema already accepts queued/running/complete/failed; no migration was applied. Existing locally saved v0.2 results remain readable.

- 50 Python tests: existing quantitative tests plus cross-language valid/expired/tampered/swapped/malformed tokens, concurrent/idempotent execution, sanitized failures/retry, strict CORS, request bounds, canonical-parameter caps and bounded-worker termination.
- Real-Neon integration: all three assets, conditional/relationship, AND, full/shared baseline, insufficient samples, all horizons through robustness, exact result reopening/reproduction, research-family FDR.
- Concurrent real submissions: one execution attempt and one result row; replay returns complete.
- Real API security: unsigned, expired, tampered, wrong-run, unknown authenticated run, arbitrary-code field and untrusted origin safely rejected.
- Deliberate failure affects only a newly created verification run: missing frozen dataset produces saved sanitized failed status; health remains good; restore that run's original dataset reference and retry the same ID → complete, two attempts, exactly one result.
- Simulated browser-state tests: cold connection retries, lost response followed by polling, running-run resume, prepared-ID preservation when result reads fail, and no duplicate preparation/fake progress.
- Browser: conditional and relationship requests complete; PREPARING and STARTING RESEARCH ENGINE are visible during the cold path; result refresh works; all five saved-result sections and light/dark layouts are usable with the Python service fully stopped; Credit → TEST THIS preserves the existing P10 prefill and honest insufficient-sample result. No browser warning/error logs observed.
- Existing market/context/focus suites pass against real Neon; raw observations, market observations and macro source runs remain unchanged.
- Database verification: 10 tables, 7 named indexes, 82 constraints; transactional read/write probe rolled back.
- ESLint, TypeScript, production build, dependency consistency and production dependency audit pass. No production dependency vulnerabilities; existing development-only audit findings were not force-upgraded.
- Credential audit: tracked/untracked source intended for commit, all 139 historical git blobs and built browser assets scanned without displaying matched values; `.env.local` ignored, no findings. Generated signing secret remains only in ignored local configuration.
- Observed local service + persistent compute-worker working set: approximately 154 MB combined; no pandas/scikit-learn/ingestion dependencies are required by the service.

## Observed local timings

Separate observed measurements, not a Render cold-start claim. Execution includes run claim, data load, statistics and complete database commit; preparation and API startup are separate. Browser polling/page reopening add delivery latency and are not statistical execution.

| Stage | Cold local execution | Warm relationship | Warm conditional |
| --- | ---: | ---: | ---: |
| Next preparation | 4.210 s | 0.273 s | 0.268 s |
| Frozen dataset load | 2.380 s | cached | cached |
| Statistics / worker | 1.616 s | 0.093 s | 0.290 s |
| Result write / commit | 1.557 s | 1.308 s | 1.311 s |
| Total API execution | 8.525 s | 2.694 s | 2.905 s |

Cold local API process startup → healthy response: **1.098 s**, measured independently. Render's idle cold start remains unmeasured until an actual deployment is available. No keep-alive traffic or paid resources were added.

Canonical real-Neon result examples:

- Conditional: `36eb39cd-c658-4cce-bfc5-571c82f35f4e`, event N=45; exact full-result reproduction passes.
- Relationship: `9a8d24e3-0ccd-412b-a8be-3a0b515ed14a`, paired N=39; exact full-result reproduction passes.
- Browser conditional: `99c63bbe-3225-4feb-97bc-1bb59fa30a7d`.
- Browser relationship: `73712f04-92f3-4c8e-83df-89c020f8345b`.

Deployment configuration follows main going forward. Render's idle sleep/wake latency remains unmeasured; first-worker cold and warm execution were measured above. Saved-result viewing is independent of Render execution; local verification with Python fully stopped is retained above. See [deployment checklist](hypothesis-production.md).
