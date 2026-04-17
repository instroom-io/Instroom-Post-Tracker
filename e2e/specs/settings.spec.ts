import { test, expect } from '@playwright/test'
import { SettingsPage } from '../pages/settings.page'
import { DashboardPage } from '../pages/dashboard.page'

// The workspace name as it exists in the database for the flashbook workspace
const ORIGINAL_WORKSPACE_NAME = 'Flashbook'
const TEST_UPDATED_NAME = '[e2e] Updated Name'

test.describe('Settings', () => {
  test('settings page loads with correct workspace name', async ({ page }) => {
    const settings = new SettingsPage(page)
    await settings.goto()

    const nameInput = settings.workspaceNameInput()
    await expect(nameInput).toBeVisible({ timeout: 8000 })
    await expect(nameInput).toHaveValue(ORIGINAL_WORKSPACE_NAME)
  })

  test('billing panel is visible to owner', async ({ page }) => {
    const settings = new SettingsPage(page)
    await settings.goto()

    await expect(settings.billingPanel()).toBeVisible({ timeout: 8000 })
  })

  test('billing panel shows trial status', async ({ page }) => {
    const settings = new SettingsPage(page)
    await settings.goto()

    const panel = settings.billingPanel()
    await expect(panel).toBeVisible({ timeout: 8000 })
    // Should contain "trial", "days remaining", or "plan" text
    await expect(panel).toContainText(/trial|days|plan/i)
  })

  test('trial banner is visible on overview with upgrade link', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()

    await expect(dashboard.trialBanner()).toBeVisible({ timeout: 8000 })
    await expect(dashboard.trialBannerUpgradeLink()).toBeVisible()
  })

  test('update workspace name persists after reload', async ({ page }) => {
    const settings = new SettingsPage(page)
    await settings.goto()
    try {
      const nameInput = settings.workspaceNameInput()
      await nameInput.clear()
      await nameInput.fill(TEST_UPDATED_NAME)
      await settings.saveBtn().click()
      await expect(page.getByText(/saved|success/i).or(page.locator('[data-sonner-toast]'))).toBeVisible({ timeout: 8000 }).catch(() => {})
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
      await page.reload()
      await expect(settings.workspaceNameInput()).toHaveValue(TEST_UPDATED_NAME, { timeout: 8000 })
    } finally {
      // Always restore original name, even on test failure
      await settings.goto()
      await settings.workspaceNameInput().clear()
      await settings.workspaceNameInput().fill(ORIGINAL_WORKSPACE_NAME)
      await settings.saveBtn().click()
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    }
  })
})
