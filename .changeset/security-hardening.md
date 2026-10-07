---
"@sofa/server": patch
---

Harden the server against malicious requests

- Send security headers, and reject API writes that a browser sends from another site (Sofa's own address comes from `BETTER_AUTH_URL` or `CORS_ORIGIN`)
- Limit request body sizes, and require a signed-in session before accepting large uploads
- Limit the uncompressed size and file count of uploaded import ZIPs
- Validate cached image and avatar file names, and serve those files so browsers can't run scripts from them
- Only let the mobile app's sign-in proxy redirect to your OIDC provider's authorization endpoint
