import { Hono } from "hono";
import { cors } from "hono/cors";

const GITHUB_RELEASES_URL =
  "https://api.github.com/repos/jakejarvis/sofa/releases/latest";

const app = new Hono();

app.use("*", cors());

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

    c.header(
      "Cache-Control",
      "public, s-maxage=900, stale-while-revalidate=3600",
    );

    return c.json({
      version: data.tag_name.replace(/^v/, ""),
      release_url: data.html_url,
    });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Failed to fetch version" },
      502,
    );
  }
});

app.post("/v1/telemetry", async (c) => {
  const body = await c.req.json();

  if (!body.instanceId || !body.version) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const posthogKey = process.env.POSTHOG_API_KEY;
  if (!posthogKey) {
    // return okay, this isn't the user's problem
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
          ...(body.features ?? {}),
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Fire-and-forget — don't fail the request if PostHog is down
  }

  return c.body(null, 204);
});

export default app;
