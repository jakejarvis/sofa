import { Hono } from "hono";
import { cors } from "hono/cors";
import { getLatestVersion } from "./lib/github";

const app = new Hono();

app.use("*", cors());

app.get("/health", (c) => c.json({ status: "healthy" }));

app.get("/v1/version", async (c) => {
  try {
    const latest = await getLatestVersion();

    c.header(
      "Cache-Control",
      "public, s-maxage=900, stale-while-revalidate=3600",
    );

    return c.json(latest);
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Failed to fetch version" },
      502,
    );
  }
});

export default app;
