import { test, expect } from '@playwright/test'
import { CampaignPage } from '../pages/campaign.page'
import { getWorkspaceId, cleanupCampaigns, seedCampaign } from '../helpers/supabase.helper'
import { TEST_CAMPAIGN_NAME } from '../helpers/test-data'

let workspaceId: string

test.beforeAll(async () => {
  workspaceId = await getWorkspaceId()
})

test.afterEach(async () => {
  await cleanupCampaigns(workspaceId)
})

test('create campaign → appears in campaigns list', async ({ page }) => {
  const campaign = new CampaignPage(page)
  await campaign.gotoList()

  const today = new Date().toISOString().split('T')[0]
  const future = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]

  await campaign.fillAndSubmitCampaign({
    name: TEST_CAMPAIGN_NAME,
    startDate: today,
    endDate: future,
  })

  // Dialog closes and campaign appears in list
  await expect(campaign.campaignRowByName(TEST_CAMPAIGN_NAME)).toBeVisible({ timeout: 10000 })
})

test('create campaign with end date before start date shows error', async ({ page }) => {
  const campaign = new CampaignPage(page)
  await campaign.gotoList()

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  await campaign.createBtn().click()
  await campaign.nameInput().fill(TEST_CAMPAIGN_NAME)
  await campaign.startDateInput().fill(today)
  await campaign.endDateInput().fill(yesterday)
  await campaign.submitBtn().click()

  // Error should be shown, dialog stays open
  await expect(page.locator('.text-destructive').first()).toBeVisible({ timeout: 5000 })
  // Submit button should still be visible (dialog did not close)
  await expect(campaign.submitBtn()).toBeVisible()
})

test('campaign detail page loads with tracking config and influencer list', async ({ page }) => {
  const campaignId = await seedCampaign(workspaceId)
  const campaign = new CampaignPage(page)
  await campaign.gotoDetail(campaignId)

  // Tracking config panel should be visible
  await expect(page.getByText(/tracking|hashtag|mention/i).first()).toBeVisible({ timeout: 8000 })
  // Influencer section should be visible
  await expect(page.getByText(/influencer/i).first()).toBeVisible()
})
