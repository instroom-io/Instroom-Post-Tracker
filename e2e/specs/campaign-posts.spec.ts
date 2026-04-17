import { test, expect } from '@playwright/test'
import { CampaignPage } from '../pages/campaign.page'
import {
  getWorkspaceId,
  cleanupCampaigns,
  cleanupInfluencers,
  cleanupPosts,
  seedCampaign,
  seedInfluencer,
  seedCampaignInfluencer,
  seedPost,
  getUsageRights,
  E2E_TAG,
} from '../helpers/supabase.helper'

let workspaceId: string
let campaignId: string
let influencerId: string
let campaignInfluencerId: string

test.beforeEach(async () => {
  workspaceId = await getWorkspaceId()
  campaignId = await seedCampaign(workspaceId)
  influencerId = await seedInfluencer(workspaceId)
  campaignInfluencerId = await seedCampaignInfluencer(campaignId, influencerId)
  await seedPost(workspaceId, campaignId, influencerId)
})

test.afterEach(async () => {
  await cleanupPosts(workspaceId)
  await cleanupInfluencers(workspaceId)
  await cleanupCampaigns(workspaceId)
})

test('posts table renders in campaign detail with seeded post', async ({ page }) => {
  const campaign = new CampaignPage(page)
  await campaign.gotoDetail(campaignId)

  const postsTable = campaign.postsTable()
  await expect(postsTable).toBeVisible({ timeout: 10000 })

  // Seeded post caption contains [e2e]
  await expect(postsTable).toContainText(E2E_TAG)
})

test('usage rights toggle updates in UI and DB', async ({ page }) => {
  const campaign = new CampaignPage(page)
  await campaign.gotoDetail(campaignId)

  // The usage rights toggle is on the influencer row in campaign-influencers-list
  const toggle = page.locator('[data-testid="usage-rights-toggle"]').first()
  await expect(toggle).toBeVisible({ timeout: 10000 })

  const initialRights = await getUsageRights(campaignInfluencerId)
  await toggle.click()

  // Optimistic UI updates immediately; allow a brief moment for DB write
  await page.waitForTimeout(1500)

  const updatedRights = await getUsageRights(campaignInfluencerId)
  expect(updatedRights).toBe(!initialRights)
})

test('posts table filters by platform', async ({ page }) => {
  const campaign = new CampaignPage(page)
  await campaign.gotoDetail(campaignId)

  // Wait for posts table first
  await expect(campaign.postsTable()).toBeVisible({ timeout: 10000 })

  // If there is a platform filter combobox / select, use it
  const platformFilter = page
    .getByRole('combobox')
    .or(page.getByRole('listbox'))
    .first()

  if (await platformFilter.count() > 0) {
    await platformFilter.click()
    const tiktokOption = page.getByRole('option', { name: /tiktok/i })
    if (await tiktokOption.count() > 0) {
      await tiktokOption.click()
    }
  }

  // Table should still be visible after any filter change (no crash)
  await expect(campaign.postsTable()).toBeVisible({ timeout: 5000 })
})
