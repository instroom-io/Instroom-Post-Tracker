import { type Page } from '@playwright/test'
import { WORKSPACE_SLUG } from '../helpers/test-data'

export class InfluencerPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`/${WORKSPACE_SLUG}/influencers`)
  }

  addBtn() {
    return this.page.locator('[data-testid="add-influencer-btn"]')
  }

  handleInput() {
    return this.page.locator('[data-testid="influencer-handle-input"]')
  }

  submitBtn() {
    return this.page.locator('[data-testid="influencer-submit-btn"]')
  }

  csvInput() {
    return this.page.locator('[data-testid="influencer-csv-input"]')
  }

  rowByHandle(handle: string) {
    return this.page.getByRole('row').filter({ hasText: handle })
  }
}
