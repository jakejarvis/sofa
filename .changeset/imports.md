---
"@sofa/server": patch
---

Make Trakt and Simkl imports more reliable

- Accept Trakt's official export (ZIP or JSON, including files with a UTF-8 BOM) and Simkl backups with nested items
- Keep rewatches and the dates titles were added, and import Trakt season and episode entries
- Skip invalid items instead of failing the whole import, and skip specials
- Keep date-only values on the right calendar day
- Stop promptly when an import is cancelled, even near the end
- Refresh each imported show once afterward to pick up new episodes
