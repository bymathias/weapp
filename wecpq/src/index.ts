import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";
import type { Env } from "./types";
import { uiRouter } from "./ui/router";
import { oauthRouter } from "./api/oauth";
import { apiRouter } from "./api/router";

const app = new Hono<Env>();

// Registered before uiRouter's blanket auth middleware so these stay public.
app.route("/", oauthRouter);
app.route("/", apiRouter);

app.get("/openapi.json", (c) =>
  c.json(
    apiRouter.getOpenAPIDocument({
      openapi: "3.0.0",
      info: {
        title: "WeCPQ API",
        version: "1.0.0",
        description:
          "Configure-Price-Quote REST API. Authenticate via POST /oauth/token (client_credentials grant) then send the returned bearer token as `Authorization: Bearer <token>`.",
      },
      servers: [{ url: "/" }],
    })
  )
);

app.get("/api-docs", swaggerUI({ url: "/openapi.json" }));

app.route("/", uiRouter);

export default app;
