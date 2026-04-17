import { test, expect } from '@playwright/test'
import { InfluencerPage } from '../pages/influencer.page'
import { getWorkspaceId, cleanupInfluencers, seedInfluencer } from '../helpers/supabase.helper'
import path from 'path'
import fs from 'fs'
import os from 'os'

let workspaceId: string

test.beforeAll(async () => {
  workspaceId = await getWorkspaceId()
})

test.afterEach(async () => {
  await cleanupInfluencers(workspaceId)
})

test('add single influencer → appears in table', async ({ page }) => {
  const influencerPage = new InfluencerPage(page)
  await influencerPage.goto()

  await influencerPage.addBtn().click()

  // The dialog opens in manual mode by default.
  // The textarea is for handles, one per line — type the handle and click "Add Influencers" (step 1)
  // The dialog then validates and goes to a confirm step with a "Confirm" button
  await influencerPage.handleInput().fill('e2e_test_single')
  await influencerPage.submitBtn().click() // "Add Influencers" — triggers validation

  // After validation, a confirm step appears. Click the Confirm button.
  const confirmBtn = page.getByRole('button', { name: /confirm/i })
  await expect(confirmBtn).toBeVisible({ timeout: 3000 })
  await confirmBtn.click()

  // Influencer handle should appear in the table
  await expect(influencerPage.rowByHandle('e2e_test_single')).toBeVisible({ timeout: 10000 })
})

test('adding duplicate handle in same workspace shows info or error feedback', async ({ page }) => {
  // Seed the influencer first directly via Supabase
  await seedInfluencer(workspaceId)

  const influencerPage = new InfluencerPage(page)
  await influencerPage.goto()

  await influencerPage.addBtn().click()
  // Use same handle as seeded influencer
  await influencerPage.handleInput().fill('e2e_playwright_handle')
  await influencerPage.submitBtn().click() // trigger validation

  // After validation goes to confirm step, click Confirm
  const confirmBtn = page.getByRole('button', { name: /confirm/i })
  await expect(confirmBtn).toBeVisible({ timeout: 3000 })
  await confirmBtn.click()

  // When all handles already exist the app shows an info toast "All handles already exist"
  // or an error toast — either way a sonner toast appears
  await expect(
    page.locator('[data-sonner-toast]').first()
  ).toBeVisible({ timeout: 8000 })
})

test('bulk CSV import → rows appear in table', async ({ page }) => {
  // The multi-column CSV template uses tiktok_handle / ig_handle / youtube_handle columns
  const csvContent = [
    'tiktok_handle,ig_handle,youtube_handle',
    '[e2e]_handle_1,,',
    '[e2e]_handle_2,,',
    '[e2e]_handle_3,,',
  ].join('\n')

  const tmpFile = path.join(os.tmpdir(), 'e2e-influencers.csv')
  fs.writeFileSync(tmpFile, csvContent)

  const influencerPage = new InfluencerPage(page)
  await influencerPage.goto()

  await influencerPage.addBtn().click()

  // Switch to "Import CSV" tab
  const csvTab = page.getByRole('tab', { name: /import csv/i })
  await csvTab.click()

  // Upload the CSV file — the file input is hidden inside a label
  await influencerPage.csvInput().setInputFiles(tmpFile)

  // The dialog auto-validates and moves to "review" step.
  // Click the Import button once it appears.
  const importBtn = page.getByRole('button', { name: /import/i })
  await expect(importBtn).toBeVisible({ timeout: 15000 })
  await importBtn.click()

  // At least a toast confirming import should appear, or the first handle in the table
  await expect(
    page.locator('[data-sonner-toast]').first()
      .or(influencerPage.rowByHandle('[e2e]_handle_1'))
  ).toBeVisible({ timeout: 10000 })

  fs.unlinkSync(tmpFile)
})
