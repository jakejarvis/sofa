---
"@sofa/server": patch
---

Update Better Auth to 1.7.16, which fixes the Expo authorization proxy signing an OAuth state the server did not issue ([GHSA-hv45-wgqh-c9j5](https://github.com/advisories/GHSA-hv45-wgqh-c9j5), CVE-2026-121802). The proxy now only signs a state that Better Auth issued and only redirects to your OIDC provider's authorization endpoint.

**Rotate `BETTER_AUTH_SECRET` after upgrading.** The advisory says the application secret must be rotated after updating to a fixed version.
