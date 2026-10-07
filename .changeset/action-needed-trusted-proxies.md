---
"@sofa/server": patch
---

commit: e5209f80fec06509cceaa0c1b0e54ff88d8ab72b

Rate-limit sign-ins by the real client IP, so spoofed `X-Forwarded-For` headers can't get around the limit

**If Sofa sits behind a reverse proxy on another machine** (for example a VPS reaching Sofa over the internet or Tailscale, or Cloudflare proxying straight to it), add the proxy's address to the new `TRUSTED_PROXIES` setting, or every user will share the proxy's rate limit. Proxies on the same host or Docker network, or elsewhere on your LAN at a private address (10.x, 172.16–31.x, 192.168.x), work without changes. See [Configuration](https://sofa.watch/docs/configuration#network).
