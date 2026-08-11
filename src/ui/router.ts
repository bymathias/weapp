import { Hono } from "hono";
import type { Env } from "../types";
import { createSession, clearSession, requireUiAuth } from "../lib/session";
import { getWorklist } from "../db/worklist";
import { loginPage, launchpadPage } from "./pages/shared";
import { worklistPage } from "./pages/worklist";
import { registerP2PUiRoutes } from "./routes/p2p";
import { registerO2CUiRoutes } from "./routes/o2c";
import { registerMasterUiRoutes } from "./routes/master";

export const uiRouter = new Hono<Env>();

uiRouter.get("/login", async (c) => {
  const error = c.req.query("error");
  return c.html(
    loginPage({
      error: error === "missing" || error === "invalid" ? error : undefined,
      username: c.req.query("username") ?? "",
    })
  );
});

uiRouter.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const usernameParam = `username=${encodeURIComponent(username)}`;

  if (!username || !password) {
    return c.redirect(`/login?error=missing&${usernameParam}`);
  }

  if (username === c.env.UI_USERNAME && password === c.env.UI_PASSWORD) {
    await createSession(c);
    return c.redirect("/");
  }
  return c.redirect(`/login?error=invalid&${usernameParam}`);
});

uiRouter.get("/logout", async (c) => {
  clearSession(c);
  return c.redirect("/login");
});

uiRouter.use("/*", requireUiAuth);

uiRouter.get("/", async (c) => {
  const worklist = await getWorklist(c.env.DB);
  return c.html(launchpadPage(worklist.length));
});

uiRouter.get("/worklist", async (c) => {
  const worklist = await getWorklist(c.env.DB);
  return c.html(worklistPage(worklist));
});

registerMasterUiRoutes(uiRouter);
registerP2PUiRoutes(uiRouter);
registerO2CUiRoutes(uiRouter);
