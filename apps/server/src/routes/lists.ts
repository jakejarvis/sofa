import {
  getRadarrList,
  getSonarrList,
  parseStatusParam,
  resolveListToken,
} from "@sofa/core/lists";
import { Hono } from "hono";

const app = new Hono();

app.get("/:token", async (c) => {
  const token = c.req.param("token");
  const result = resolveListToken(token);
  if (!result) {
    return c.json([]);
  }

  const statuses = parseStatusParam(c.req.query("status") ?? null);

  if (result.provider === "sonarr") {
    return c.json(await getSonarrList(result.userId, statuses));
  }
  return c.json(getRadarrList(result.userId, statuses));
});

export default app;
