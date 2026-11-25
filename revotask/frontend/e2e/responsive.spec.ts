import { expect, test, type Page } from "@playwright/test";
import { apiPost, loginViaApi, registerViaApi, startSession, uniqueName, uniqueUser } from "./helpers";

// REQ-NFR-3: usable at phone width. The page itself must never scroll sideways (the board scrolls inside its own container).
test.use({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });

const hasHorizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

test.describe("Mobile layout (375x667)", () => {
  test("public pages fit the viewport", async ({ page }) => {
    for (const path of ["/login", "/register"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await hasHorizontalOverflow(page), `${path} overflows horizontally`).toBe(false);
    }
  });

  test("signed-in pages fit the viewport and keep tap targets reachable", async ({ page, request, context, baseURL }) => {
    const user = uniqueUser("mobile");
    await registerViaApi(request, user);
    const token = await loginViaApi(request, user);
    const board = await apiPost<{ id: string }>(request, token, "/boards", { name: uniqueName("Phone Board") });
    for (const name of ["To Do", "Doing", "Done"]) {
      const column = await apiPost<{ id: string }>(request, token, `/boards/${board.id}/columns`, { name });
      await apiPost(request, token, `/columns/${column.id}/cards`, { title: `A rather long card title for ${name} that must wrap` });
    }
    await startSession(context, baseURL!, token);

    for (const path of ["/", "/my-tasks", "/profile", `/boards/${board.id}`]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await hasHorizontalOverflow(page), `${path} overflows horizontally`).toBe(false);
    }

    // On the board, columns scroll inside their own container and the first one is fully on screen.
    const firstColumn = page.getByRole("region", { name: "Column: To Do" });
    await expect(firstColumn).toBeVisible();
    const box = await firstColumn.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);

    // A phone user can move a card without dragging: open it and use "Move to column".
    await firstColumn.getByRole("article").first().getByRole("button").click();
    const dialog = page.getByRole("dialog", { name: "Card details" });
    await expect(dialog).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(375);
    await dialog.getByLabel("Move to column").selectOption({ label: "Done" });
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("region", { name: "Column: Done" }).getByRole("article", { name: /for To Do/ }),
    ).toBeVisible();
  });
});
