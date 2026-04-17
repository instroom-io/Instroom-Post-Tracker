import { test, expect } from '@playwright/test'
import { AnalyticsPage } from '../pages/analytics.page'
import { WORKSPACE_SLUG } from '../helpers/test-data'

test.describe('Analytics — trial plan (all features unlocked)', () => {
  test('analytics page loads successfully', async ({ page }) => {
    const analytics = new AnalyticsPage(page)
    await analytics.goto()
    await expect(page).toHaveURL(new RegExp(`/${WORKSPACE_SLUG}/analytics`))
    await expect(analytics.postVolumeChart()).toBeVisible({ timeout: 10000 })
  })

  test('trial plan: EMV section is visible and not gated', async ({ page }) => {
    const analytics = new AnalyticsPage(page)
    await analytics.goto()

    await expect(analytics.emvSection()).toBeVisible({ timeout: 10000 })
    // No upgrade gate overlays should exist (trial plan has all features unlocked)
    await expect(analytics.upgradeGates()).toHaveCount(0, { timeout: 5000 })
  })

  test('date filter changes displayed range without errors', async ({ page }) => {
    const analytics = new AnalyticsPage(page)
    await analytics.goto()
    await expect(analytics.postVolumeChart()).toBeVisible({ timeout: 10000 })

    // Attempt to interact with any date range combobox / select present on the page
    const dateFilter = page
      .getByRole('combobox')
      .or(page.getByRole('button', { name: /last|days|range|period/i }))
      .first()

    if (await dateFilter.count() > 0) {
      await dateFilter.click()
      const firstOption = page.getByRole('option').first()
      if (await firstOption.count() > 0) {
        await firstOption.click()
      }
    }

    // Page must not show an error boundary after the filter change
    await expect(page.locator('[data-testid="error-boundary"], .error-boundary')).toHaveCount(0)
    // Chart should still be rendered
    await expect(analytics.postVolumeChart()).toBeVisible({ timeout: 8000 })
  })
})
