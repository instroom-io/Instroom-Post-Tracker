import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load .env.local from the worktree root first; fall back to the parent repo root
// (worktrees share .env.local with the parent via git worktree layout)
const envPath = path.resolve(__dirname, '.env.local')
const parentEnvPath = path.resolve(__dirname, '../../.env.local')
dotenv.config({ path: fs.existsSync(envPath) ? envPath : parentEnvPath })

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,
  retries: 1,
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    storageState: 'e2e/.auth/solo.json',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      use: { storageState: undefined },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  globalSetup: undefined,
})
