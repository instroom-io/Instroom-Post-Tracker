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

test('posts table renders in downloads tab with seeded post', async ({ page }) => {
  const campaign = new CampaignPage(page)
  // CampaignPostsTable renders under the "downloads" tab (downloaded posts)
  await campaign.gotoDetail(campaignId, 'downloads')

  const postsTable = campaign.postsTable()
  await expect(postsTable).toBeVisible({ timeout: 10000 })

  // Seeded post caption contains [e2e]
  await expect(postsTable).toContainText('e2e_playwright_handle')
})

test('usage rights toggle updates in UI and DB', async ({ page }) => {
  const campaign = new CampaignPage(page)
  // Usage rights toggle is in the "influencers" tab (campaign-influencers-list)
  await campaign.gotoDetail(campaignId, 'influencers')

  const toggle = page.locator('[data-testid="usage-rights-toggle"]').first()
  await expect(toggle).toBeVisible({ timeout: 10000 })

  const initialRights = await getUsageRights(campaignInfluencerId)

  // Start listening for the server action POST before clicking
  const serverActionDone = page.waitForResponse(
    (resp) => resp.request().method() === 'POST' && resp.status() === 200,
    { timeout: 15000 }
  )
  await toggle.click()
  // Wait for optimistic UI update (confirms click registered)
  await expect(toggle).toHaveAttribute('aria-checked', 'true', { timeout: 5000 })
  // Wait for server action to complete (POST 200 response)
  await serverActionDone

  const updatedRights = await getUsageRights(campaignInfluencerId)
  expect(updatedRights).toBe(!initialRights)
})

test('posts gallery renders detected posts', async ({ page }) => {
  const campaign = new CampaignPage(page)
  // CampaignPostsGallery renders under the "posts" tab
  await campaign.gotoDetail(campaignId, 'posts')

  // The posts tab shows detected posts count and gallery
  await expect(page.getByText(/\d+ detected/i).first()).toBeVisible({ timeout: 8000 })
  // Should not show an error boundary
  await expect(page.locator('[data-testid="error-boundary"]')).toHaveCount(0)
})
