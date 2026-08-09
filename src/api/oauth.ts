import { Hono } from "hono";
import type { Env } from "../types";
import { issueAccessToken } from "../lib/token";

export const oauthRouter = new Hono<Env>();

// OAuth2 client-credentials grant. Accepts standard form-encoded body
// (also honors HTTP Basic auth for client_id/client_secret) so it can be
// wired up from a UiPath connector or curl/Postman alike.
oauthRouter.post("/oauth/token", async (c) => {
  let clientId: string | undefined;
  let clientSecret: string | undefined;
  let grantType: string | undefined;

  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await c.req.json().catch(() => ({}) as Record<string, string>);
    clientId = body.client_id;
    clientSecret = body.client_secret;
    grantType = body.grant_type;
  } else {
    const body = await c.req.parseBody();
    clientId = typeof body.client_id === "string" ? body.client_id : undefined;
    clientSecret = typeof body.client_secret === "string" ? body.client_secret : undefined;
    grantType = typeof body.grant_type === "string" ? body.grant_type : undefined;
  }

  const authHeader = c.req.header("authorization");
  if ((!clientId || !clientSecret) && authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice(6));
    const [id, secret] = decoded.split(":");
    clientId = clientId ?? id;
    clientSecret = clientSecret ?? secret;
  }

  if (grantType && grantType !== "client_credentials") {
    return c.json({ error: "unsupported_grant_type" }, 400);
  }

  if (clientId !== c.env.OAUTH_CLIENT_ID || clientSecret !== c.env.OAUTH_CLIENT_SECRET) {
    return c.json({ error: "invalid_client" }, 401);
  }

  const { token, expiresIn } = await issueAccessToken(clientId, c.env.SESSION_SECRET);
  return c.json({
    access_token: token,
    token_type: "Bearer",
    expires_in: expiresIn,
  });
});
