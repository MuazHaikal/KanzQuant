# Controlled Evidence Library workflow

The public interface is read-only. Legacy hypothesis URLs redirect to Evidence Library and Study Focus. Both preparation/run API aliases reject requests without the existing server-only research credential. Do not expose that credential in browser code, public environment variables or logs.

Run the application and configured research service locally using the existing ignored environment file. Store an approved definition (the existing hypothesis parameter schema), or an array of approved definitions, in a JSON file. Then run:

```
npm run evidence:run -- approved-definitions.json
```

The command uses `.env.local`; it does not edit secrets or require manual SQL. The default application address is localhost:3001, overridable through `KANZQUANT_INTERNAL_URL`. Execution is restricted to the configured `HYPOTHESIS_API_URL` origin. Each definition is validated by the existing server and executed by the existing signed-capability service. Only saved IDs and progress are printed. HTTP requests and completion waits are bounded; on failure inspect the saved ledger, then retry.

Default idempotency is exact normalized parameters + frozen monthly dataset hash + engine version. Preparation is serialized with the existing database advisory lock. A matching queued/running/completed run is reused, and completed results are not recomputed. Failed runs can be retried by supplying `{"run_id":"saved-uuid"}` as a definition. No unrelated records are changed. Updated inputs change the dataset hash and therefore create a new study; unchanged inputs do not create duplicate family members. To intentionally create a fresh repeat, pass `--refresh`. Keep the engine version updated when its methodology changes. Do not use refresh casually: named-family BH corrections include all family members, including missing tests conservatively.

Use the same command with an approved array to refresh a catalogue. It processes sequentially with rate-limit spacing, not uncontrolled parallel execution. Reproduction without database writes remains available through `npm run hypothesis:reproduce -- saved-uuid`.

Evidence Library reads the existing research ledger, not a second database. It shows the latest 1,000 completed studies; family adjustments still include the full named family. Missing statistics remain unavailable. Heuristic engine evidence categories are separate from adjusted statistical significance. No scores, analyst estimates or forecast values are manufactured.
