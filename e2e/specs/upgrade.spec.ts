import { test, expect } from '@playwright/test'
import { UpgradePage } from '../pages/upgrade.page'
import { DashboardPage } from '../pages/dashboard.page'
import { WORKSPACE_SLUG } from '../helpers/test-data'

test.describe('Upgrade / Billing', () => {
  test('upgrade page accessible from trial banner upgrade link', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()

    await expect(dashboard.trialBannerUpgradeLink()).toBeVisible({ timeout: 8000 })
    await dashboard.trialBannerUpgradeLink().click()
    await expect(page).toHaveURL(new RegExp(`/${WORKSPACE_SLUG}/upgrade`), { timeout: 8000 })
  })

  test('upgrade page loads and shows solo pricing section', async ({ page }) => {
    const upgrade = new UpgradePage(page)
    await upgrade.goto()

    await expect(upgrade.soloSection()).toBeVisible({ timeout: 10000 })
    // A price figure should be displayed
    await expect(page.getByText(/\$\d+/)).toBeVisible()
  })

  test('billing period toggle switches between monthly and annual pricing', async ({ page }) => {
    const upgrade = new UpgradePage(page)
    await upgrade.goto()

    await expect(upgrade.soloSection()).toBeVisible({ timeout: 10000 })

    const toggle = upgrade.billingPeriodToggle()
    await expect(toggle).toBeVisible()

    // Click the "Annual" button inside the toggle container to switch to annual billing
    await toggle.getByRole('button', { name: /annual/i }).click()

    // Annual billing indicator should appear once period switches
    await expect(page.getByText(/billed annually/i)).toBeVisible({ timeout: 5000 })
  })

  test('checkout button is present on upgrade page', async ({ page }) => {
    const upgrade = new UpgradePage(page)
    await upgrade.goto()

    await expect(upgrade.soloSection()).toBeVisible({ timeout: 10000 })
    // Checkout / subscribe button (or a placeholder) should be visible
    await expect(upgrade.checkoutButton()).toBeVisible({ timeout: 5000 })
  })
})
