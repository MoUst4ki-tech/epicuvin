// Fichier : tests/epicuvin.spec.js
import { test, expect } from '@playwright/test';

test('Le robot peut se connecter et ouvrir la modale d\'ajout de vin', async ({ page }) => {
  // 1. Le robot va sur la page d'accueil (index.html)
  // (Le chemin dépendra de comment Playwright lance votre site, on utilise un chemin relatif)
 await page.goto('http://localhost:3000/index.html');

  // 2. Le robot remplit le formulaire avec SES identifiants
  await page.fill('#email', 'robot@epicuvin.test');
  await page.fill('#password', 'RobotTest2026!');
  
  // 3. Il clique sur "Se connecter"
  await page.click('#submit-btn');

  // 4. Il vérifie qu'il est bien arrivé sur la page de la cave
  await expect(page).toHaveURL(/.*cave.html/);
  
  // 5. Il vérifie que le titre "Ma Cave" est bien visible
  await expect(page.locator('#cellar-title')).toBeVisible();

  // 6. Il clique sur le bouton pour ajouter un vin
  await page.click('#open-modal-btn');
  
  // 7. Il vérifie que la fenêtre de luxe (modale) s'est bien ouverte
  const modal = page.locator('#wine-modal');
  await expect(modal).toHaveClass(/active/);
});