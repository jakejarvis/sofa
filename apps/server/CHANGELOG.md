# @sofa/server

## 0.3.0

### Minor Changes

- [`a4439dd`](https://github.com/jakejarvis/sofa/commit/a4439dddb11fdf25ffac5660a3a64d1b2706d333) Thanks [@jakejarvis](https://github.com/jakejarvis)! - Back up the database automatically before applying migrations on upgrade. These backups appear as "Pre-upgrade backup" in Settings and are kept in the `backups` folder of your data directory.

### Patch Changes

- [`e5209f8`](https://github.com/jakejarvis/sofa/commit/e5209f80fec06509cceaa0c1b0e54ff88d8ab72b) Thanks [@jakejarvis](https://github.com/jakejarvis)! - Rate-limit sign-ins by the real client IP, so spoofed `X-Forwarded-For` headers can't get around the limit

  **If Sofa sits behind a reverse proxy on another machine** (for example a VPS reaching Sofa over the internet or Tailscale, or Cloudflare proxying straight to it), add the proxy's address to the new `TRUSTED_PROXIES` setting, or every user will share the proxy's rate limit. Proxies on the same host or Docker network, or elsewhere on your LAN at a private address (10.x, 172.16–31.x, 192.168.x), work without changes. See [Configuration](https://sofa.watch/docs/configuration#network).

- [#68](https://github.com/jakejarvis/sofa/pull/68) [`0de7560`](https://github.com/jakejarvis/sofa/commit/0de75606a858a6c47e9c78fc3320b73195f96aaa) Thanks [@jakejarvis](https://github.com/jakejarvis)! - Restore backups made by older versions of Sofa: a restored database is now migrated before it replaces the live one

- [#68](https://github.com/jakejarvis/sofa/pull/68) [`0de7560`](https://github.com/jakejarvis/sofa/commit/0de75606a858a6c47e9c78fc3320b73195f96aaa) Thanks [@jakejarvis](https://github.com/jakejarvis)! - Make Trakt and Simkl imports more reliable

  - Accept Trakt's official export (ZIP or JSON, including files with a UTF-8 BOM) and Simkl backups with nested items
  - Keep rewatches and the dates titles were added, and import Trakt season and episode entries
  - Skip invalid items instead of failing the whole import, and skip specials
  - Keep date-only values on the right calendar day
  - Stop promptly when an import is cancelled, even near the end
  - Refresh each imported show once afterward to pick up new episodes

- [#68](https://github.com/jakejarvis/sofa/pull/68) [`0de7560`](https://github.com/jakejarvis/sofa/commit/0de75606a858a6c47e9c78fc3320b73195f96aaa) Thanks [@jakejarvis](https://github.com/jakejarvis)! - Fix several library, discovery, and stats issues

  - Fully load TV shows the first time you open them
  - Leave titles you've rated or watched out of recommendations
  - Only offer aired episodes in Continue Watching
  - Don't add duplicate watches when marking a season or show watched
  - Line up stats totals with their charts, and fix month rollover
  - Keep one failing title from stalling scheduled refreshes; manual jobs now start in the background and say when they're already running
  - Remove duplicate cast and crew entries
  - Keep the `/3` path when `TMDB_API_BASE_URL` points at a custom server

- [#68](https://github.com/jakejarvis/sofa/pull/68) [`0de7560`](https://github.com/jakejarvis/sofa/commit/0de75606a858a6c47e9c78fc3320b73195f96aaa) Thanks [@jakejarvis](https://github.com/jakejarvis)! - Make metadata refreshes lighter: ended shows refresh less often, returning shows refetch only their recent seasons, empty TMDB lookups are remembered, and episode art is processed in the background

- [#68](https://github.com/jakejarvis/sofa/pull/68) [`0de7560`](https://github.com/jakejarvis/sofa/commit/0de75606a858a6c47e9c78fc3320b73195f96aaa) Thanks [@jakejarvis](https://github.com/jakejarvis)! - Harden the server against malicious requests

  - Send security headers, and reject API writes that a browser sends from another site (Sofa's own address comes from `BETTER_AUTH_URL` or `CORS_ORIGIN`)
  - Limit request body sizes, and require a signed-in session before accepting large uploads
  - Limit the uncompressed size and file count of uploaded import ZIPs
  - Validate cached image and avatar file names, and serve those files so browsers can't run scripts from them
  - Only let the mobile app's sign-in proxy redirect to your OIDC provider's authorization endpoint

- [#68](https://github.com/jakejarvis/sofa/pull/68) [`0de7560`](https://github.com/jakejarvis/sofa/commit/0de75606a858a6c47e9c78fc3320b73195f96aaa) Thanks [@jakejarvis](https://github.com/jakejarvis)! - Fix scrobbling from media servers: episodes from Plex and Emby no longer match the wrong show, Emby's native webhook payloads are accepted, and a show is refreshed when a scrobbled episode isn't known yet
- Updated dependencies []:
  - @sofa/api@0.3.0
  - @sofa/auth@0.3.0
  - @sofa/config@0.3.0
  - @sofa/core@0.3.0
  - @sofa/db@0.3.0
  - @sofa/logger@0.3.0
  - @sofa/tmdb@0.3.0
