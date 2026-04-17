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

  // The textarea is for handles, one per line — type the handle
  await influencerPage.handleInput().fill('e2e_test_single')
  await influencerPage.submitBtn().click() // "Add Influencers" — triggers API validation

  // After validation, a confirm step appears. The handle may be "not_found" via the
  // external API (fake handle), so the checkbox is unchecked. Manually check it to
  // enable the Confirm button — the dialog allows adding not_found handles.
  const checkbox = page.locator('input[type="checkbox"]').first()
  await expect(checkbox).toBeVisible({ timeout: 20000 })
  if (!(await checkbox.isChecked())) {
    await checkbox.check()
  }

  const confirmBtn = page.getByRole('button', { name: /confirm/i })
  await expect(confirmBtn).toBeEnabled({ timeout: 3000 })
  await confirmBtn.click()

  // Influencer handle should appear in the table
  await expect(influencerPage.rowByHandle('e2e_test_single')).toBeVisible({ timeout: 10000 })
})

test('adding duplicate handle in same workspace shows info or error feedback', async ({ page }) => {
  // Seed the influencer first directly via Supabase
  await seedInfluencer(workspaceId) // tiktok_handle: 'e2e_playwright_handle'

  const influencerPage = new InfluencerPage(page)
  await influencerPage.goto()

  await influencerPage.addBtn().click()
  // Use same handle as seeded influencer
  await influencerPage.handleInput().fill('e2e_playwright_handle')
  await influencerPage.submitBtn().click() // trigger validation

  // After validation, confirm step appears. Check the checkbox to force-add.
  const checkbox = page.locator('input[type="checkbox"]').first()
  await expect(checkbox).toBeVisible({ timeout: 20000 })
  if (!(await checkbox.isChecked())) {
    await checkbox.check()
  }

  const confirmBtn = page.getByRole('button', { name: /confirm/i })
  await expect(confirmBtn).toBeEnabled({ timeout: 3000 })
  await confirmBtn.click()

  // Since handle already exists in the workspace, addInfluencersBatch returns
  // added=0 and the dialog shows an info toast
  await expect(
    page.locator('[data-sonner-toast]').first()
  ).toBeVisible({ timeout: 8000 })
})

test('bulk CSV upload parses file and shows validation review', async ({ page }) => {
  // The multi-column CSV template uses tiktok_handle / ig_handle / youtube_handle columns
  const csvContent = [
    'tiktok_handle,ig_handle,youtube_handle',
    'e2e_csv_handle_1,,',
    'e2e_csv_handle_2,,',
    'e2e_csv_handle_3,,',
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

  // After upload, CSV is parsed and API validation runs.
  // The review step appears showing results (handles will be "not found" for fake handles).
  // Wait for the review step to appear by checking for the "not found" pill or message.
  await expect(
    page.getByText(/not found/i).first()
  ).toBeVisible({ timeout: 20000 })

  fs.unlinkSync(tmpFile)
})
