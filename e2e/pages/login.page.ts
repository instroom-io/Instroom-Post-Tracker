import { type Page } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login')
  }

  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email)
    await this.page.locator('input[name="password"]').fill(password)
    await this.page.getByRole('button', { name: /sign in/i }).click()
  }

  async errorMessage() {
    return this.page.locator('[data-testid="login-error"], .text-destructive').first()
  }
}
