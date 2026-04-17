import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const AUTH_FILE = path.join(__dirname, '.auth/solo.json')

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'arjay09.adr43@gmail.com'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'Pass1234'

async function globalSetup() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto('http://localhost:3000/login')
  await page.getByLabel('Email').fill(TEST_EMAIL)
  await page.getByLabel('Password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/flashbook/overview', { timeout: 15_000 })

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
  await page.context().storageState({ path: AUTH_FILE })
  await browser.close()
}

export default globalSetup
