import { type Page } from '@playwright/test'
import { WORKSPACE_SLUG } from '../helpers/test-data'

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`/${WORKSPACE_SLUG}/overview`)
  }

  trialBanner() {
    return this.page.locator('[data-testid="trial-banner"]')
  }

  trialBannerUpgradeLink() {
    return this.page.locator('[data-testid="trial-banner-upgrade-link"]')
  }

  navLink(label: string) {
    return this.page.getByRole('link', { name: label, exact: true })
  }

  async navTo(section: 'Overview' | 'Campaigns' | 'Influencers' | 'Analytics' | 'Settings') {
    await this.navLink(section).click()
  }
}
