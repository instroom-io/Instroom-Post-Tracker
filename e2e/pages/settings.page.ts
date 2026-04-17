import { type Page } from '@playwright/test'
import { WORKSPACE_SLUG } from '../helpers/test-data'

export class SettingsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`/${WORKSPACE_SLUG}/settings`)
  }

  workspaceNameInput() {
    return this.page.locator('input[name="name"], input[placeholder*="workspace" i]').first()
  }

  saveBtn() {
    return this.page.getByRole('button', { name: /save/i }).first()
  }

  billingPanel() {
    return this.page.locator('[data-testid="billing-panel"]')
  }

  trialBanner() {
    return this.page.locator('[data-testid="trial-banner"]')
  }
}
