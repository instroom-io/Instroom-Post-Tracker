import { type Page } from '@playwright/test'
import { WORKSPACE_SLUG } from '../helpers/test-data'

export class UpgradePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`/${WORKSPACE_SLUG}/upgrade`)
  }

  soloSection() {
    return this.page.locator('[data-testid="upgrade-solo-section"]')
  }

  billingPeriodToggle() {
    return this.page.locator('[data-testid="billing-period-toggle"]')
  }

  checkoutButton() {
    // LemonSqueezy button or placeholder
    return this.page.getByRole('button', { name: /subscribe|checkout|get started|upgrade/i }).first()
  }
}
