import { test, expect } from '@playwright/test';

test.describe('Test complet du Sommelier (Cycle de vie d\'un vin)', () => {

  test('Le robot se connecte, ajoute un vin, le vérifie, puis le boit (supprime)', async ({ page }) => {
    
    // ==========================================
    // 1. CONNEXION
    // ==========================================
    await page.goto('http://127.0.0.1:3000/index.html');
    await page.fill('#email', 'robot@epicuvin.test');
    await page.fill('#password', 'RobotTest2026!');
    await page.click('#submit-btn');

    // Vérification : On est bien dans la cave
    await expect(page).toHaveURL(/.*cave/);
    await expect(page.locator('#cellar-title')).toBeVisible();

    // ==========================================
    // 2. AJOUT D'UN NOUVEAU VIN
    // ==========================================
    await page.click('#open-modal-btn');
    
    // On crée un nom unique pour être sûr de ne pas se tromper de carte à la fin
    const nomDuVinTest = `Château Robot Épicuvin ${Date.now()}`;

    // Remplissage de tous les champs de la modale
    await page.fill('#name', nomDuVinTest);
    await page.selectOption('#type', 'Rouge');
    await page.fill('#year', '2015');
    
    await page.selectOption('#region', 'Bordeaux');
    await page.fill('#appellation', 'Pauillac');
    await page.fill('#cepage', 'Cabernet Sauvignon');
    
    await page.selectOption('#format', 'Magnum (1.5L)');
    await page.fill('#quantity', '3');
    
    await page.fill('#apogee-debut', '2025');
    await page.fill('#apogee-fin', '2035');
    await page.fill('#commentaire', 'Bouteille de test ajoutée par le robot.');

    // Enregistrement
    await page.click('button[type="submit"].submit-btn');

    // On attend que la modale disparaisse
    const modal = page.locator('#wine-modal');
    await expect(modal).not.toHaveClass(/active/);

    // ==========================================
    // 3. VÉRIFICATION (Le vin est-il dans la cave ?)
    // ==========================================
    // On demande au robot de chercher une carte qui contient le nom unique de notre vin
    const wineCard = page.locator('.wine-card', { hasText: nomDuVinTest });
    
    // On vérifie que la carte est bien visible à l'écran
    await expect(wineCard).toBeVisible();
    
    // On vérifie que la pastille de quantité affiche bien "3 en cave"
    await expect(wineCard.locator('.stock-badge')).toContainText('3 en cave');

    // ==========================================
    // 4. SUPPRESSION DU VIN (Nettoyage)
    // ==========================================
    // TRÈS IMPORTANT : Le navigateur affiche une popup "Voulez-vous retirer ce vin ?"
    // Il faut dire au robot de cliquer sur "OK" automatiquement quand elle apparaît.
    page.once('dialog', async dialog => {
      console.log(`Le robot accepte la popup : ${dialog.message()}`);
      await dialog.accept();
    });

    // Le robot clique sur le bouton "Retirer" situé DANS la carte de notre vin de test
    await wineCard.locator('.delete-btn').click();

    // Vérification finale : La carte de ce vin ne doit plus exister
    await expect(wineCard).not.toBeVisible();
  });

});