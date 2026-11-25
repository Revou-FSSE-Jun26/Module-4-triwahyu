import { expect, test, type Page } from "@playwright/test";
import { uniqueName, uniqueUser } from "./helpers";

const column = (page: Page, name: string) => page.getByRole("region", { name: `Column: ${name}` });
const card = (page: Page, title: string) => page.getByRole("article", { name: `Card: ${title}` });

async function addColumn(page: Page, name: string, done = false) {
  await page.getByRole("button", { name: "+ Add column" }).click();
  await page.getByLabel("Column name").fill(name);
  if (done) await page.getByLabel("Cards in this column count as done").check();
  await page.getByRole("button", { name: "Add column", exact: true }).click();
  await expect(column(page, name)).toBeVisible();
}

async function addCard(page: Page, columnName: string, title: string) {
  await column(page, columnName).getByRole("button", { name: "+ Add card" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Add card", exact: true }).click();
  await expect(column(page, columnName).getByRole("article", { name: `Card: ${title}` })).toBeVisible();
}

// REQ-E2E-1: the complete Kanban journey in 8 steps against whatever PLAYWRIGHT_BASE_URL points at.
test("Kanban journey: register to notification bell", async ({ page }) => {
  const user = uniqueUser("kanban");
  const boardName = uniqueName("E2E Board");

  await test.step("1. Register a new account", async () => {
    await page.goto("/register");
    await page.getByLabel("Name", { exact: true }).fill(user.name);
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill(user.password);
    await page.getByLabel("Confirm password").fill(user.password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/login\?registered=1/);
    await expect(page.getByRole("status")).toHaveText("Account created. Sign in to continue.");
  });

  await test.step("2. Log in and land on the dashboard", async () => {
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Your boards" })).toBeVisible();
    await expect(page.getByText("No boards yet")).toBeVisible();
  });

  await test.step("3. Create a board", async () => {
    await page.getByRole("button", { name: "New board" }).click();
    await page.getByLabel("Board name").fill(boardName);
    await page.getByRole("button", { name: "Create board" }).click();
    await expect(page).toHaveURL(/\/boards\/[0-9a-f-]{36}/);
    await expect(page.getByRole("heading", { name: boardName })).toBeVisible();
  });

  await test.step("4. Add three columns", async () => {
    await addColumn(page, "To Do");
    await addColumn(page, "In Progress");
    await addColumn(page, "Done", true);
    await expect(page.getByRole("region", { name: /^Column:/ })).toHaveCount(3);
  });

  await test.step("5. Create cards, drag one to another column, and keep it after reload", async () => {
    await addCard(page, "To Do", "Write specs");
    await addCard(page, "To Do", "Ship it");

    const persisted = page.waitForResponse(
      (response) => /\/cards\/[^/]+\/position$/.test(response.url()) && response.request().method() === "PATCH",
    );
    await card(page, "Write specs").dragTo(column(page, "In Progress"));
    expect((await persisted).status()).toBe(200);

    await expect(column(page, "In Progress").getByRole("article", { name: "Card: Write specs" })).toBeVisible();
    await expect(column(page, "To Do").getByRole("article", { name: "Card: Write specs" })).toHaveCount(0);

    await page.reload();
    await expect(column(page, "In Progress").getByRole("article", { name: "Card: Write specs" })).toBeVisible();
    await expect(column(page, "To Do").getByRole("article", { name: "Card: Ship it" })).toBeVisible();
  });

  await test.step("6. Add and edit a comment", async () => {
    await card(page, "Ship it").getByRole("button", { name: "Ship it" }).click();
    const dialog = page.getByRole("dialog", { name: "Card details" });
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Add a comment").fill("First comment");
    await dialog.getByRole("button", { name: "Post comment" }).click();
    const comments = dialog.getByRole("list", { name: "Comments" });
    await expect(comments.getByText("First comment")).toBeVisible();
    // A brand-new comment must not be labelled edited (this assertion would have caught the equal-timestamp bug).
    await expect(comments.getByText(/· edited/)).toHaveCount(0);

    await dialog.getByRole("button", { name: /^Edit comment: First comment/ }).click();
    await dialog.getByLabel("Edit comment").fill("Edited comment");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(comments.getByText("Edited comment")).toBeVisible();
    await expect(comments.getByText("First comment")).toHaveCount(0);
    await expect(comments.getByText(/· edited/)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  await test.step("7. Search for a card", async () => {
    await page.getByLabel("Search cards").fill("Write");
    const results = page.getByRole("list", { name: "Search results" });
    await expect(results.getByRole("button", { name: /Write specs/ })).toBeVisible();
    await expect(results.getByRole("button", { name: /Ship it/ })).toHaveCount(0);
  });

  await test.step("8. See the unread count on the notification bell", async () => {
    const bell = page.getByRole("button", { name: /^Notifications, \d+ unread$/ });
    await expect(bell).toBeVisible();
    await expect(page.getByTestId("unread-count")).toHaveText("1");
    await bell.click();
    await expect(page.getByRole("region", { name: "Notifications" }).getByText(/Welcome to RevoTask/)).toBeVisible();
  });
});
