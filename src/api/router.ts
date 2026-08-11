import { OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "../types";
import { requireBearerAuth } from "../lib/bearer";
import { registerMasterRoutes } from "./routes/master";
import { registerP2PRoutes } from "./routes/p2p";
import { registerO2CRoutes } from "./routes/o2c";
import { registerPaymentsRoutes } from "./routes/payments";

export const apiRouter = new OpenAPIHono<Env>().basePath("/api");

apiRouter.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
  description: "Obtain via POST /oauth/token (client_credentials grant).",
});

apiRouter.use("/*", requireBearerAuth);

registerMasterRoutes(apiRouter);
registerP2PRoutes(apiRouter);
registerO2CRoutes(apiRouter);
registerPaymentsRoutes(apiRouter);
