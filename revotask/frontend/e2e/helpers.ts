import { expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

export const API_BASE = (process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:5000/api").replace(/\/+$/, "");
export const TOKEN_COOKIE = "revotask_token";

export type TestUser = { name: string; email: string; password: string };

/** A user no other run (or test) can collide with, so tests are repeatable in any order. */
export function uniqueUser(label = "e2e"): TestUser {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return { name: `E2E ${label} ${id}`, email: `${label}-${id}@example.com`, password: "Passw0rd!x1" };
}

export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export async function registerViaApi(request: APIRequestContext, user: TestUser): Promise<void> {
  const response = await request.post(`${API_BASE}/auth/register`, { data: user });
  expect(response.status(), `register ${user.email}`).toBe(201);
}

export async function loginViaApi(request: APIRequestContext, user: TestUser): Promise<string> {
  const response = await request.post(`${API_BASE}/auth/login`, { data: { email: user.email, password: user.password } });
  expect(response.status(), `login ${user.email}`).toBe(200);
  return (await response.json()).data.access_token as string;
}

export async function signInViaUi(page: Page, user: TestUser): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Your boards" })).toBeVisible();
}

/** Start a browser session without the login form (used where login is not the thing under test). */
export async function startSession(context: BrowserContext, baseURL: string, token: string): Promise<void> {
  await context.addCookies([{ name: TOKEN_COOKIE, value: token, url: baseURL }]);
}

export async function apiPost<T>(request: APIRequestContext, token: string, path: string, data: unknown): Promise<T> {
  const response = await request.post(`${API_BASE}${path}`, { data, headers: { Authorization: `Bearer ${token}` } });
  expect(response.status(), `POST ${path}`).toBe(201);
  return (await response.json()).data as T;
}
