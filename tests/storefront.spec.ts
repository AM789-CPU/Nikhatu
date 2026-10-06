import { test, expect } from "@playwright/test";

const base = process.env.TEST_BASE_URL || "http://localhost:3000";

test("desktop layout and outfit slideshow", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "NIKHATU", level: 1 })).toBeVisible();
  await expect(page.locator(".hero-model.is-active")).toBeVisible();
  await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth, headline: document.querySelector(".hero-wordmark")?.getBoundingClientRect().toJSON(), hero: document.querySelector(".hero")?.getBoundingClientRect().toJSON(), brokenImages: [...document.images].filter((image) => image.complete && !image.naturalWidth).map((image) => image.src) }));
  console.log("Desktop dimensions", dimensions);
  expect(dimensions.page).toBe(dimensions.viewport);
  expect(dimensions.brokenImages).toEqual([]);
  await page.getByRole("button", { name: "Pause outfit slideshow" }).click();
  await page.getByRole("button", { name: "View outfit 1" }).click();
  await page.getByRole("button", { name: "Next outfit" }).click();
  await expect(page.locator(".hero-model.is-active")).toHaveAttribute("src", "/images/hero-look-2.png");
  await page.getByRole("button", { name: "Previous outfit" }).click();
  await expect(page.locator(".hero-model.is-active")).toHaveAttribute("src", "/images/hero-look-1.png");
  expect(errors).toEqual([]);
});

test("wishlist, persistent bag, checkout and order tracking", async ({ page }) => {
  await page.goto(base);
  await page.locator(".save-product").first().click();
  await page.getByRole("button", { name: "Wishlist, 1 saved items" }).click();
  await expect(page.getByRole("heading", { name: "Your wishlist (1)." })).toBeVisible();
  await page.getByRole("button", { name: "CHOOSE YOUR SIZE" }).click();
  await page.getByRole("button", { name: "M", exact: true }).click();
  await page.getByRole("button", { name: "ADD TO BAG", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your bag (1)." })).toBeVisible();
  await page.getByRole("button", { name: "Increase quantity of The Everyday Oversized Tee" }).click();
  await expect(page.getByRole("heading", { name: "Your bag (2)." })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Shopping bag, 2 items" }).click();
  await expect(page.getByRole("heading", { name: "Your bag (2)." })).toBeVisible();
  await page.getByRole("button", { name: "CONTINUE TO CHECKOUT" }).click();
  const email = `browser-order-${Date.now()}@example.com`;
  await page.getByLabel("EMAIL ADDRESS", { exact: true }).fill(email);
  await page.getByLabel("FULL NAME", { exact: true }).fill("Browser Tester");
  await page.getByLabel("MOBILE NUMBER", { exact: true }).fill("9876543210");
  await page.getByLabel("SHIPPING ADDRESS", { exact: true }).fill("12 Fashion Avenue");
  await page.getByLabel("CITY", { exact: true }).fill("Mumbai");
  await page.getByLabel("PIN CODE", { exact: true }).fill("400001");
  await page.getByRole("combobox", { name: "STATE", exact: true }).selectOption("Maharashtra");
  await page.screenshot({ path: "artifacts/checkout.png" });
  await page.getByRole("button", { name: /^PLACE ORDER/ }).click();
  await expect(page.getByRole("heading", { name: "Good things are on their way." })).toBeVisible();
  const reference = (await page.locator(".order-reference button").innerText()).match(/NK-[A-Z0-9]+/)?.[0];
  expect(reference).toBeTruthy();
  await page.getByRole("button", { name: "TRACK MY ORDER" }).click();
  await page.getByLabel("EMAIL ADDRESS", { exact: true }).fill(email);
  await page.getByRole("button", { name: "TRACK MY ORDER" }).click();
  await expect(page.locator(".tracking-result h3")).toHaveText(reference!);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Shopping bag, 0 items" }).click();
  await expect(page.getByRole("heading", { name: "A little empty. For now." })).toBeVisible();
});

test("collection filters, sorting and product search", async ({ page }) => {
  await page.goto(`${base}/shop?category=women`);
  await expect(page.getByRole("heading", { name: "Women. Your way." })).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.getByRole("group", { name: "Filter by department" }).getByRole("button", { name: "All", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(8);
  await page.getByRole("combobox", { name: "Sort products" }).selectOption("price-low");
  await expect(page.locator(".product-name").first()).toHaveText("The Playday Everyday Tee");
  await page.getByRole("button", { name: "Search products" }).click();
  await page.getByRole("searchbox").fill("sage");
  await expect(page.locator(".search-result")).toHaveCount(2);
  await page.locator(".search-result").first().click();
  await expect(page.getByRole("heading", { name: "A closer look." })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("account registration and persistent session", async ({ page }) => {
  await page.goto(base);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByLabel("YOUR NAME", { exact: true }).fill("Browser Tester");
  await page.getByLabel("EMAIL ADDRESS", { exact: true }).fill(`browser-account-${Date.now()}@example.com`);
  await page.getByLabel("PASSWORD", { exact: true }).fill("NikhatuTest123!");
  await page.getByRole("button", { name: "JOIN THE NIKHATU CIRCLE" }).click();
  await expect(page.getByRole("heading", { name: "Hey, Browser." })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Your account", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hey, Browser." })).toBeVisible();
  await page.getByRole("button", { name: "SIGN OUT", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Good to see you." })).toBeVisible();
});

test("mobile layout and category navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator(".mobile-navigation").getByRole("link", { name: "Men", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Men. Your way." })).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(4);
  await page.locator(".product-name").first().click();
  await page.getByRole("button", { name: "M", exact: true }).click();
  await page.getByRole("button", { name: "ADD TO BAG", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your bag (1)." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
