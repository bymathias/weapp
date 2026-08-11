import { OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "../types";
import { requireBearerAuth } from "../lib/bearer";
import { isAuthenticated } from "../lib/session";
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

// The PDF links are also used directly by a logged-in browser (the PO/SO
// detail pages' "Download PDF" buttons), so accept a UI session cookie
// there in addition to the bearer token API automation uses everywhere else.
apiRouter.use("/purchase-orders/:po_number/pdf", async (c, next) => {
  if (await isAuthenticated(c)) {
    c.set("apiClientId", "ui-session");
  }
  await next();
});
apiRouter.use("/sales-orders/:so_number/pdf", async (c, next) => {
  if (await isAuthenticated(c)) {
    c.set("apiClientId", "ui-session");
  }
  await next();
});

apiRouter.use("/*", requireBearerAuth);

registerMasterRoutes(apiRouter);
registerP2PRoutes(apiRouter);
registerO2CRoutes(apiRouter);
registerPaymentsRoutes(apiRouter);
