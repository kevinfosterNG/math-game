import { expect, test } from '@playwright/test'

async function enterAsGuest(page: import('@playwright/test').Page) {
  const guestButton = page.getByRole('button', { name: 'Play as guest' })
  await expect(guestButton.or(page.getByRole('heading', { name: /multiplication arena/i }))).toBeVisible()
  if (await guestButton.isVisible()) await guestButton.click()
}

test('starts a keyboard-friendly guest round and resets settings after reload', async ({ page }) => {
  await page.goto('/')
  await enterAsGuest(page)
  await page.getByRole('button', { name: /easy/i }).click()
  const input = page.getByLabel('Your answer')
  await expect(input).toBeFocused()
  await input.press('Enter')
  await expect(page.getByRole('alert')).toContainText('whole-number')
  await page.getByRole('button', { name: 'Mute sound effects' }).click()
  await page.reload()
  await enterAsGuest(page)
  await expect(page.getByRole('button', { name: 'Mute sound effects' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /multiplication arena/i })).toBeVisible()
})

test('completes 25 guest questions and clears the record after reload', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await enterAsGuest(page)
  await page.getByRole('button', { name: 'Mute sound effects' }).click()
  await page.getByRole('button', { name: /easy/i }).click()
  const input = page.getByLabel('Your answer')

  for (let index = 0; index < 25; index += 1) {
    const equation = page.locator('[aria-label*="times"]').first()
    const label = await equation.getAttribute('aria-label')
    const match = label?.match(/(\d+) times (\d+)/)
    expect(match).not.toBeNull()
    await input.fill(String(Number(match![1]) * Number(match![2])))
    await input.press('Enter')
    if (index < 24) {
      await expect(page.getByText(/Yes!|Not quite!/)).toBeVisible()
      await expect(input).toBeVisible()
    }
  }

  await expect(page.getByRole('heading', { name: /perfect round|arena cleared|round complete/i })).toBeVisible()
  await expect(page.getByText(/new personal best/i)).toBeVisible()
  await page.reload()
  await enterAsGuest(page)
  await expect(page.getByRole('heading', { name: /your records/i })).toBeVisible()
  await expect(page.locator('article').filter({ hasText: 'Easy' })).toContainText('No rounds yet')
})
