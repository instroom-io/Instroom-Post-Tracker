import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const AUTH_FILE = path.join(__dirname, '.auth/solo.json')

async function globalSetup() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto('http://localhost:3000/login')
  await page.getByLabel('Email').fill('arjay09.adr43@gmail.com')
  await page.getByLabel('Password').fill('Pass1234')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/flashbook/overview', { timeout: 15_000 })

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
  await page.context().storageState({ path: AUTH_FILE })
  await browser.close()
}

export default globalSetup
