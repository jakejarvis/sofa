---
"@sofa/server": patch
---

Fix several library, discovery, and stats issues

- Fully load TV shows the first time you open them
- Leave titles you've rated or watched out of recommendations
- Only offer aired episodes in Continue Watching
- Don't add duplicate watches when marking a season or show watched
- Line up stats totals with their charts, and fix month rollover
- Keep one failing title from stalling scheduled refreshes; manual jobs now start in the background and say when they're already running
- Remove duplicate cast and crew entries
- Keep the `/3` path when `TMDB_API_BASE_URL` points at a custom server
