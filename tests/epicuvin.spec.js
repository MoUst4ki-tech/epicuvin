import { test, expect } from '@playwright/test';

test('Le robot peut se connecter et ouvrir la modale d\'ajout de vin', async ({ page }) => {
  // On utilise 127.0.0.1 au lieu de localhost
  await page.goto('http://127.0.0.1:3000/index.html');

  await page.fill('#email', 'robot@epicuvin.test');
  await page.fill('#password', 'RobotTest2026!');
  
  await page.click('#submit-btn');

  await expect(page).toHaveURL(/.*cave.html/);
  await expect(page.locator('#cellar-title')).toBeVisible();

  await page.click('#open-modal-btn');
  
  const modal = page.locator('#wine-modal');
  await expect(modal).toHaveClass(/active/);
});