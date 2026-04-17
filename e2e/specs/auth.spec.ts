import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/login.page'
import { WORKSPACE_SLUG } from '../helpers/test-data'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'arjay09.adr43@gmail.com'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'Pass1234'

test.describe('Auth', () => {
  test.use({ storageState: { cookies: [], origins: [] } }) // override — no auth for auth tests

  test('login with valid credentials redirects to overview', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(TEST_EMAIL, TEST_PASSWORD)
    await expect(page).toHaveURL(new RegExp(`/${WORKSPACE_SLUG}/overview`), { timeout: 15000 })
  })

  test('login with wrong password shows error', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(TEST_EMAIL, 'wrongpassword')
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
    await page.locator('[data-testid="user-menu-btn"]').click()
    await page.getByRole('menuitem', { name: /sign out|log out|logout/i }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })
})
