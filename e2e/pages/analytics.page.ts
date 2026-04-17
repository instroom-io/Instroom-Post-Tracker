import { type Page } from '@playwright/test'
import { WORKSPACE_SLUG } from '../helpers/test-data'

export class AnalyticsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`/${WORKSPACE_SLUG}/analytics`)
  }

  postVolumeChart() {
    return this.page.locator('[data-testid="post-volume-chart"]')
  }

  emvSection() {
    return this.page.locator('[data-testid="emv-section"]')
  }

  upgradeGates() {
    return this.page.locator('[data-testid="upgrade-gate"]')
  }
}
