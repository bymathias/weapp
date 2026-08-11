import type { MiddlewareHandler } from "hono";
import type { Env } from "../types";
import { verifyAccessToken } from "./token";

export const requireBearerAuth: MiddlewareHandler<Env> = async (c, next) => {
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
