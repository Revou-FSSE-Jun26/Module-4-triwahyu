import { expect, test } from "@playwright/test";
import { registerViaApi, signInViaUi, uniqueUser } from "./helpers";

// REQ-AUTH-6, REQ-AUTH-7, REQ-AUTH-8: the four authentication scenarios. No fixed waits; every test asserts an outcome.
test.describe("Authentication flows", () => {
  test("successful login redirects to the dashboard", async ({ page, request }) => {
    const user = uniqueUser("login");
    await registerViaApi(request, user);

    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Your boards" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  });

  test("invalid credentials show a safe error and keep the user on the login page", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(uniqueUser("nobody").email);
    await page.getByLabel("Password").fill("Wrong-pass-1");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Invalid email or password." })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("button", { name: "Log out" })).toHaveCount(0);
  });

  test("an unauthenticated visitor is redirected from a protected page", async ({ page }) => {
    await page.goto("/my-tasks");

    await expect(page).toHaveURL(/\/login\?next=%2Fmy-tasks/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("logging out redirects to login and protected pages stay locked", async ({ page, request }) => {
    const user = uniqueUser("logout");
    await registerViaApi(request, user);
    await signInViaUi(page, user);

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login/);

    for (const path of ["/", "/profile", "/my-tasks"]) {
      await page.goto(path);
      await expect(page, `${path} after logout`).toHaveURL(/\/login/);
    }
  });
});
