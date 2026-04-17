import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/login.page'
import { WORKSPACE_SLUG } from '../helpers/test-data'

test.describe('Auth', () => {
  test.use({ storageState: { cookies: [], origins: [] } }) // override — no auth for auth tests

  test('login with valid credentials redirects to overview', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('arjay09.adr43@gmail.com', 'Pass1234')
    await expect(page).toHaveURL(new RegExp(`/${WORKSPACE_SLUG}/overview`), { timeout: 15000 })
  })

  test('login with wrong password shows error', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('arjay09.adr43@gmail.com', 'wrongpassword')
    // Wait for error to appear — login page stays and error is shown
    const errorLocator = await loginPage.errorMessage()
    await expect(errorLocator).toBeVisible({ timeout: 8000 })
  })
})

test.describe('Auth — authenticated', () => {
  test('session persists after reload', async ({ page }) => {
    await page.goto(`/${WORKSPACE_SLUG}/overview`)
    await page.reload()
    await expect(page).toHaveURL(new RegExp(`/${WORKSPACE_SLUG}/overview`))
  })

  test('logout redirects to login', async ({ page }) => {
    await page.goto(`/${WORKSPACE_SLUG}/overview`)
    // Open user menu — try common button patterns used in AppShell/UserMenu
    const userMenuBtn = page
      .getByRole('button', { name: /account|user|profile|menu/i })
      .or(page.locator('[data-testid="user-menu-btn"]'))
      .first()
    await userMenuBtn.click()
    await page.getByRole('menuitem', { name: /sign out|log out|logout/i }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })
})
