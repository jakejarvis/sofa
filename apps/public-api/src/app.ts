import { zValidator } from "@hono/zod-validator";
import { checkRateLimit } from "@vercel/firewall";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import { getImporter, getImporterConfig } from "./importers";

const GITHUB_RELEASES_URL = "https://api.github.com/repos/jakejarvis/sofa/releases/latest";

const app = new Hono();

app.use("*", cors());

// ─── Version Check ──────────────────────────────────────────

app.get("/v1/version", async (c) => {
  try {
    const res = await fetch(GITHUB_RELEASES_URL, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "sofa-public-api",
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);

    const data = (await res.json()) as {
      tag_name: string;
      html_url: string;
    };

    c.header("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");

    return c.json({
      version: data.tag_name.replace(/^v/, ""),
      release_url: data.html_url,
    });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to fetch version" }, 502);
  }
});

// ─── Telemetry ──────────────────────────────────────────────

app.post(
  "/v1/telemetry",
  zValidator(
    "json",
    z.object({
      instanceId: z.string().min(1),
      version: z.string().min(1),
      arch: z.string().optional(),
      users: z.union([z.number(), z.string()]).optional(),
      titles: z.union([z.number(), z.string()]).optional(),
      features: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
  async (c) => {
    const body = c.req.valid("json");

    const posthogKey = process.env.POSTHOG_API_KEY;
    if (!posthogKey) {
      return c.body(null, 204);
    }

    try {
      await fetch("https://us.i.posthog.com/i/v0/e/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: posthogKey,
          event: "instance_report",
          distinct_id: body.instanceId,
          properties: {
            version: body.version,
            arch: body.arch,
            users: body.users,
            titles: body.titles,
            ...body.features,
          },
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      // Fire-and-forget — don't fail the request if PostHog is down
    }

    return c.body(null, 204);
  },
);

// ─── Import OAuth Proxy ─────────────────────────────────────
// Rate limiting: Configure via Vercel dashboard WAF/rate-limit rules:
//   - "import-device-code" — device-code initiation (e.g. 5 req/IP/300 sec)
//   - "import-poll"        — token polling (e.g. 60 req/IP/minute)
// The self-hosted server also prevents concurrent imports per user
// via the importJobs table.

const ProviderEnum = z.enum(["trakt", "simkl"]);

app.post(
  "/v1/import/:provider/device-code",
  zValidator(
    "param",
    z.object({
      provider: ProviderEnum,
    }),
  ),
  async (c) => {
    try {
      const { rateLimited } = await checkRateLimit("import-device-code", {
        request: c.req.raw,
      });
      if (rateLimited) {
        return c.json({ error: "Rate limit exceeded" }, 429);
      }
    } catch (e) {
      // Rate limiter error (e.g. WAF rule not configured) — fail open but log
      console.warn("checkRateLimit error (import-device-code):", e);
    }

    const { provider } = c.req.valid("param");

    const importer = getImporter(provider);
    const config = getImporterConfig(provider);
    if (!importer || !config.clientId) {
      return c.json({ error: `${provider} is not configured` }, 503);
    }

    try {
      const result = await importer.getDeviceCode(config.clientId, config.clientSecret);
      return c.json(result);
    } catch (e) {
      return c.json(
        {
          error: e instanceof Error ? e.message : "Failed to get device code",
        },
        502,
      );
    }
  },
);

app.post(
  "/v1/import/:provider/poll",
  zValidator(
    "param",
    z.object({
      provider: ProviderEnum,
    }),
  ),
  zValidator(
    "json",
    z.object({
      device_code: z.string().min(1).max(256),
    }),
  ),
  async (c) => {
    try {
      const { rateLimited } = await checkRateLimit("import-poll", {
        request: c.req.raw,
      });
      if (rateLimited) {
        return c.json({ error: "Rate limit exceeded" }, 429);
      }
    } catch (e) {
      // Rate limiter error (e.g. WAF rule not configured) — fail open but log
      console.warn("checkRateLimit error (import-poll):", e);
    }

    const { provider } = c.req.valid("param");
    const { device_code } = c.req.valid("json");

    const importer = getImporter(provider);
    const config = getImporterConfig(provider);
    if (!importer || !config.clientId) {
      return c.json({ error: `${provider} is not configured` }, 503);
    }

    try {
      const result = await importer.pollForToken(config.clientId, config.clientSecret, device_code);

      if (result.status !== "authorized") {
        return c.json({ status: result.status });
      }

      // Fetch user data and return it inline
      try {
        const data = await importer.fetchUserData(result.accessToken, config.clientId);
        return c.json({ status: "authorized", data });
      } catch (e) {
        // Auth succeeded but data fetch failed. Return a distinct status so
        // the client can show a meaningful error instead of polling forever.
        return c.json({
          status: "fetch_error",
          error: e instanceof Error ? e.message : "Failed to fetch user data",
        });
      }
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "Poll failed" }, 502);
    }
  },
);

export default app;
