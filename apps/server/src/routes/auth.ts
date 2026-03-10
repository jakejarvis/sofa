import { auth } from "@sofa/auth/server";
import { Hono } from "hono";

const app = new Hono();

app.all("/*", (c) => auth.handler(c.req.raw));

export default app;
