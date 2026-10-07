# Hypothesis service verification — 2026-10-06

Status: deployment-ready locally; **not publicly deployed**. Render Dashboard requires sign-in (GitHub browser session also asks for login), Vercel Dashboard requires login, and Vercel CLI reports logged out. GitHub CLI is authenticated, but main was not pushed because doing so could deploy an unconfigured frontend. External Render/Vercel authentication is the remaining boundary.

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

Next actions: authenticate Render/Vercel, publish tested source in the controlled deployment sequence, deploy the Blueprint, configure the same shared secret and actual API URL in the existing Vercel project, then run public-domain QA. See [exact deployment checklist](hypothesis-production.md). Public health, actual Render runtime and public cold-start behavior are deliberately **not** claimed verified yet.
