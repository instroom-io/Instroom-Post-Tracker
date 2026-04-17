import { type Page } from '@playwright/test'
import { WORKSPACE_SLUG } from '../helpers/test-data'

export class CampaignPage {
  constructor(private page: Page) {}

  async gotoList() {
    await this.page.goto(`/${WORKSPACE_SLUG}/campaigns`)
  }

  async gotoDetail(campaignId: string, tab?: string) {
    const url = tab
      ? `/${WORKSPACE_SLUG}/campaigns/${campaignId}?tab=${tab}`
      : `/${WORKSPACE_SLUG}/campaigns/${campaignId}`
    await this.page.goto(url)
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
    // Select TikTok platform using the platform button testid
    const tiktokBtn = this.page.locator('[data-testid="platform-btn-tiktok"]')
    if (await tiktokBtn.count() > 0) {
      await tiktokBtn.click()
    }
    await this.submitBtn().click()
  }

  campaignRowByName(name: string) {
    return this.page.getByRole('row').filter({ hasText: name })
  }
}
