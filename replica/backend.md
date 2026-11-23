# Backend

v1 has **no server**, on purpose. The checklist below records what that means for each item.

| Item | Status |
|---|---|
| Auth, sessions, password reset, OAuth | Not needed: no accounts. Data never leaves the device except the calls below. |
| Database, migrations, access rules | On-device storage. `schema.sql` is the plan for optional sync (RLS on every table, idempotent device-generated ids, tombstones). |
| Payments | None. The app is free; the only cost is the user's own Claude usage for photos. |
| Email, jobs | None. |
| Integrations | Claude API (user's key, called directly from the device; key never in backups or URLs). Open Food Facts (read-only, no key, user can switch it off). |
| Secrets | No secrets in the repo or the build. `.env.example` is empty on purpose. |
| Input validation | All numbers are range-checked in the UI; model output is schema-validated by the SDK before use. |
| Rate limits | Claude 429s show a "wait a minute" message; one retry in the SDK. |
| Uploads | Photos capped at 25 MB, shrunk to 1,280 px JPEG before sending. |
| User data in URLs or logs | None. Search words go to Open Food Facts only when online search is on. |
| `npm audit` | Run in CI logs; see the PR for the current count. |
| Account deletion | "Delete all my data" in Me wipes everything on the device. |
| Privacy policy | `PRIVACY.md` lists both processors (Anthropic, Open Food Facts). |
