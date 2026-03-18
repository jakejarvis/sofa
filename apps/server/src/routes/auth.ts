import { Hono } from "hono";

import { auth } from "@sofa/auth/server";

const app = new Hono();

app.all("/*", (c) => auth.handler(c.req.raw));

export default app;
