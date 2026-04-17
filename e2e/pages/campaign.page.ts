import { type Page } from '@playwright/test'
import { WORKSPACE_SLUG } from '../helpers/test-data'

export class CampaignPage {
  constructor(private page: Page) {}

  async gotoList() {
    await this.page.goto(`/${WORKSPACE_SLUG}/campaigns`)
  }

  async gotoDetail(campaignId: string) {
    await this.page.goto(`/${WORKSPACE_SLUG}/campaigns/${campaignId}`)
  }

  createBtn() {
    return this.page.locator('[data-testid="create-campaign-btn"]')
  }

  nameInput() {
    return this.page.locator('[data-testid="campaign-name-input"]')
  }

  startDateInput() {
    return this.page.locator('[data-testid="campaign-start-date"]')
  }

  endDateInput() {
    return this.page.locator('[data-testid="campaign-end-date"]')
  }

  submitBtn() {
    return this.page.locator('[data-testid="campaign-submit-btn"]')
  }

  postsTable() {
    return this.page.locator('[data-testid="campaign-posts-table"]')
  }

  async fillAndSubmitCampaign(opts: {
    name: string
    startDate: string
    endDate: string
  }) {
    await this.createBtn().click()
    await this.nameInput().fill(opts.name)
    await this.startDateInput().fill(opts.startDate)
    await this.endDateInput().fill(opts.endDate)
    // Select TikTok platform if available (check for checkboxes)
    const tiktokCheckbox = this.page.getByRole('checkbox', { name: /tiktok/i })
    if (await tiktokCheckbox.count() > 0 && !(await tiktokCheckbox.isChecked())) {
      await tiktokCheckbox.click()
    }
    await this.submitBtn().click()
  }

  campaignRowByName(name: string) {
    return this.page.getByRole('row').filter({ hasText: name })
  }
}
