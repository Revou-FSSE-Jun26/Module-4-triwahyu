import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { API_BASE, apiPost, loginViaApi, registerViaApi, startSession, uniqueName, uniqueUser } from "./helpers";

// Not part of the regular suite (see playwright.config.ts testIgnore). Run on demand:
//   SCREENSHOT_DIR=../docs/screenshots/local npx playwright test e2e/screenshots.spec.ts --config=screenshots.config.ts
// Point PLAYWRIGHT_BASE_URL and E2E_API_BASE_URL at production to capture the live app.
const OUT = process.env.SCREENSHOT_DIR ?? "../docs/screenshots/local";
const shot = (page: Page, name: string) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });

test.describe.configure({ mode: "serial" });

test("capture desktop screenshots of every page", async ({ page, request, context, baseURL }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1366, height: 820 });

  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await shot(page, "01-register");
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await shot(page, "02-login");

  const user = uniqueUser("shots");
  await registerViaApi(request, user);
  const token = await loginViaApi(request, user);
  const me = (await (await request.get(`${API_BASE}/users/me`, { headers: { Authorization: `Bearer ${token}` } })).json()).data as { id: string };
  const teammate = uniqueUser("teammate");
  await registerViaApi(request, teammate);

  const board = await apiPost<{ id: string }>(request, token, "/boards", { name: uniqueName("Product Launch") });
  await apiPost(request, token, `/boards/${board.id}/members`, { email: teammate.email, role: "member" });
  const columns: Record<string, string> = {};
  for (const [name, done] of [["To Do", false], ["In Progress", false], ["Done", true]] as const) {
    columns[name] = (await apiPost<{ id: string }>(request, token, `/boards/${board.id}/columns`, { name, is_done: done })).id;
  }
  const cards: Record<string, string> = {};
  for (const [title, column] of [["Write the project brief", "To Do"], ["Define acceptance criteria", "To Do"], ["Build the Flask API", "In Progress"], ["Set up CI", "Done"]] as const) {
    cards[title] = (await apiPost<{ id: string }>(request, token, `/columns/${columns[column]}/cards`, { title, description: "Kanban demo card", ...(title !== "Set up CI" ? { assignee_id: me.id } : {}) })).id;
  }
  await apiPost(request, token, `/cards/${cards["Build the Flask API"]}/comments`, { content: "API is up on PostgreSQL." });
  await startSession(context, baseURL!, token);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your boards" })).toBeVisible();
  await expect(page.getByTestId("unread-count")).toBeVisible();
  await shot(page, "03-dashboard");

  await page.goto(`/boards/${board.id}`);
  await expect(page.getByRole("region", { name: "Column: To Do" })).toBeVisible();
  await shot(page, "04-board-detail");

  await page.getByRole("button", { name: "Write the project brief" }).click();
  const dialog = page.getByRole("dialog", { name: "Card details" });
  await dialog.getByLabel("Add a comment").fill("Drafted; ready for review.");
  await dialog.getByRole("button", { name: "Post comment" }).click();
  await expect(dialog.getByRole("list", { name: "Comments" }).getByText("Drafted; ready for review.")).toBeVisible();
  await shot(page, "05-card-detail-modal-comments");
  await page.keyboard.press("Escape");

  // A card in mid-drag: start the drag, hover the target column, capture, then drop.
  const source = page.getByRole("article", { name: "Card: Define acceptance criteria" });
  const target = page.getByRole("region", { name: "Column: In Progress" });
  await source.hover();
  await page.mouse.down();
  await target.hover();
  await target.hover({ position: { x: 60, y: 120 } });
  await shot(page, "06-card-dragged-between-columns");
  await page.mouse.up();
  await expect(target.getByRole("article", { name: "Card: Define acceptance criteria" })).toBeVisible();
  await shot(page, "07-card-after-drop");

  await page.getByRole("button", { name: /^Notifications, \d+ unread$/ }).click();
  await expect(page.getByRole("region", { name: "Notifications" })).toBeVisible();
  await shot(page, "08-notification-bell-unread");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Analytics" }).click();
  await expect(page.getByRole("dialog", { name: "Board analytics" })).toBeVisible();
  await expect(page.getByText(/completed this week/)).toBeVisible();
  await shot(page, "09-analytics");
  await page.keyboard.press("Escape");

  await page.goto("/my-tasks");
  await expect(page.getByRole("heading", { name: "My Tasks" })).toBeVisible();
  await shot(page, "10-my-tasks");
  await page.goto("/profile");
  await expect(page.getByLabel("Name")).toHaveValue(user.name);
  await shot(page, "11-profile");
});

test("capture mobile screenshots", async ({ browser, request, baseURL }) => {
  test.setTimeout(90_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const user = uniqueUser("phone");
  await registerViaApi(request, user);
  const token = await loginViaApi(request, user);
  const board = await apiPost<{ id: string }>(request, token, "/boards", { name: uniqueName("Phone Board") });
  for (const name of ["To Do", "Doing", "Done"]) {
    const column = await apiPost<{ id: string }>(request, token, `/boards/${board.id}/columns`, { name });
    await apiPost(request, token, `/columns/${column.id}/cards`, { title: `A long card title for ${name} that wraps` });
  }
  await startSession(context, baseURL!, token);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your boards" })).toBeVisible();
  await shot(page, "m1-dashboard");
  await page.goto(`/boards/${board.id}`);
  await expect(page.getByRole("region", { name: "Column: To Do" })).toBeVisible();
  await shot(page, "m2-board");
  await page.getByRole("region", { name: "Column: To Do" }).getByRole("article").first().getByRole("button").click();
  await expect(page.getByRole("dialog", { name: "Card details" })).toBeVisible();
  await shot(page, "m3-card-modal");
  await context.close();
});
