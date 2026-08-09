import { getSignedCookie, setSignedCookie, deleteCookie } from "hono/cookie";
import type { Context, MiddlewareHandler } from "hono";
import type { Env } from "../types";

const COOKIE_NAME = "wecpq_session";
const SESSION_VALUE = "authenticated";

export async function createSession(c: Context<Env>): Promise<void> {
  await setSignedCookie(c, COOKIE_NAME, SESSION_VALUE, c.env.SESSION_SECRET, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export function clearSession(c: Context<Env>): void {
  deleteCookie(c, COOKIE_NAME, { path: "/" });
}

export async function isAuthenticated(c: Context<Env>): Promise<boolean> {
  const value = await getSignedCookie(c, c.env.SESSION_SECRET, COOKIE_NAME);
  return value === SESSION_VALUE;
}

export const requireUiAuth: MiddlewareHandler<Env> = async (c, next) => {
  if (!(await isAuthenticated(c))) {
    return c.redirect("/login");
  }
  await next();
};
