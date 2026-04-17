import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load .env.local from the worktree root first; fall back to the parent repo root
const envPath = path.resolve(__dirname, '.env.local')
const parentEnvPath = path.resolve(__dirname, '../../.env.local')
dotenv.config({ path: fs.existsSync(envPath) ? envPath : parentEnvPath })

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 30_000,
  globalSetup: './e2e/global.setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    storageState: 'e2e/.auth/solo.json',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
