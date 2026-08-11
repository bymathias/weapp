import type { MiddlewareHandler } from "hono";
import type { Env } from "../types";
import { verifyAccessToken } from "./token";

export const requireBearerAuth: MiddlewareHandler<Env> = async (c, next) => {
  // A preceding route-specific middleware (e.g. the PDF download route,
  // which also accepts a logged-in browser's UI session) may have already
  // established an identity — don't demand a bearer token on top of that.
  if (c.get("apiClientId")) {
    return next();
  }

  const authHeader = c.req.header("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return c.json({ error: "unauthorized", message: "Missing bearer token" }, 401);
  }

  const claims = await verifyAccessToken(match[1], c.env.SESSION_SECRET);
  if (!claims) {
    return c.json({ error: "unauthorized", message: "Invalid or expired token" }, 401);
  }

  c.set("apiClientId", claims.clientId);
  await next();
};
