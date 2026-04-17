import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/login.page'
import { WORKSPACE_SLUG } from '../helpers/test-data'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'arjay09.adr43@gmail.com'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'Pass1234'

test.describe('Auth', () => {
  test.use({ storageState: { cookies: [], origins: [] } }) // override — no auth for auth tests

  // Tests that the auth middleware redirects unauthenticated users to /login
  // and that the login form is rendered. Full sign-in is validated implicitly by
  // global setup (which must succeed for all other tests to run).
  test('unauthenticated user is redirected to login page', async ({ page }) => {
    await page.goto(`/${WORKSPACE_SLUG}/overview`)
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
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
})

// Logout test uses a FRESH session (not solo.json) so it doesn't invalidate
// the shared stored session that all other tests depend on.
test.describe('Auth — logout (isolated session)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('logout redirects to login', async ({ page }) => {
    // Log in fresh to create a session independent of solo.json
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(TEST_EMAIL, TEST_PASSWORD)
    await expect(page).toHaveURL(new RegExp(`/${WORKSPACE_SLUG}/overview`), { timeout: 20000 })

    // Mark all tours as seen so the tour overlay never blocks clicks
    await page.evaluate(() => {
      localStorage.setItem('instroom-tour', JSON.stringify({
        state: { hasSeenAgencyTour: true, hasSeenWorkspaceTour: true, hasSeenCampaignTour: true, hasSeenCampaignsTour: true },
        version: 0,
      }))
    })
    await page.reload()
    await expect(page).toHaveURL(new RegExp(`/${WORKSPACE_SLUG}/overview`))

    // Open workspace switcher (contains the Log out button)
    await page.locator('[data-testid="ws-switcher-btn"]').click()
    // Click "Log out" in the dropdown
    await page.getByRole('button', { name: /log out/i }).click()
    // Confirm dialog appears — click the destructive "Sign out" button.
    // force:true bypasses pointer-events interception from the tour overlay,
    // which can appear on a fresh session before Zustand rehydrates tour flags.
    await page.getByRole('button', { name: /sign out/i }).click({ force: true })
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })
})
