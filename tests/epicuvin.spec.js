import { test, expect } from '@playwright/test';

test.describe('Test complet de l\'application Épicuvin', () => {

  // ==========================================
  // HOOK : Exécuté avant CHAQUE test
  // ==========================================
  test.beforeEach(async ({ page }) => {
    // Le robot se connecte automatiquement avant chaque scénario
    await page.goto('http://127.0.0.1:3000/index.html');
    await page.fill('#email', 'robot@epicuvin.test');
    await page.fill('#password', 'RobotTest2026!');
    await page.click('#submit-btn');

    // Vérification : On est bien dans la cave
    await expect(page).toHaveURL(/.*cave/);
    await expect(page.locator('#cellar-title')).toBeVisible();
  });

  // ==========================================
  // TEST 1 : CYCLE DE VIE D'UN VIN
  // ==========================================
  test('1. Ajout, vérification et suppression d\'un vin', async ({ page }) => {
    await page.click('#open-modal-btn');
    
    const nomDuVinTest = `Château Robot Épicuvin ${Date.now()}`;

    // Remplissage
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
    await page.click('#wine-form button[type="submit"]');

    // On attend que la modale disparaisse
    const modal = page.locator('#wine-modal');
    await expect(modal).not.toHaveClass(/active/);

    // Vérification de la présence
    const wineCard = page.locator('.wine-card', { hasText: nomDuVinTest });
    await expect(wineCard).toBeVisible();
    await expect(wineCard.locator('.stock-badge')).toContainText('3 en cave');

    // Suppression
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await wineCard.locator('.delete-btn').click();
    await expect(wineCard).not.toBeVisible();
  });

  // ==========================================
  // TEST 2 : MISE À JOUR DU PROFIL
  // ==========================================
  test('2. Modification des informations du profil', async ({ page }) => {
    // Ouverture de la modale profil
    await page.click('#profile-btn');
    
    const profileModal = page.locator('#profile-modal');
    await expect(profileModal).toHaveClass(/active/);

    // Vérification de sécurité : l'email doit être bloqué (disabled)
    await expect(page.locator('#profile-email')).toBeDisabled();

    // Remplissage des nouvelles données
    const timestamp = Date.now();
    await page.fill('#profile-prenom', `Robot_${timestamp}`);
    await page.fill('#profile-nom', 'TesteurAutomatique');
    await page.fill('#profile-telephone', '0612345678');

    // Sauvegarde
    await page.click('#profile-form button[type="submit"]');

    // Vérification de la fermeture de la modale
    await expect(profileModal).not.toHaveClass(/active/);

    // Vérification de l'apparition de la notification (Toast) de succès
    const toast = page.locator('#toast');
    await expect(toast).toContainText('Profil mis à jour');
  });

  // ==========================================
  // TEST 3 : LE SOMMELIER IA
  // ==========================================
  test('3. Interaction avec le Sommelier IA (Gemini)', async ({ page }) => {
    // Ouverture du chatbot
    await page.click('#chatbot-toggle');
    
    const chatbotWindow = page.locator('#chatbot-window');
    await expect(chatbotWindow).toHaveClass(/active/);

    // Rédaction d'une question au sommelier
    const questionTest = 'Quel vin de ma cave me conseilles-tu avec une viande rouge ?';
    await page.fill('#chatbot-input-field', questionTest);
    
    // Envoi de la demande
    await page.click('#chatbot-send');

    // Vérification que notre question apparaît bien dans l'interface
    await expect(page.locator('.message.user').last()).toHaveText(questionTest);

    // Attente de la réponse de l'IA.
    // L'API Gemini peut mettre quelques secondes à répondre. On donne au robot 15 secondes max.
    // L'index 0 est le message de bienvenue, l'index 1 sera la vraie réponse.
    const reponseBot = page.locator('.message.bot').nth(1);
    await expect(reponseBot).toBeVisible({ timeout: 15000 });
    await expect(reponseBot).not.toHaveText('...', { timeout: 30000 });

    // Fermeture du chatbot
    await page.click('#chatbot-close');
    await expect(chatbotWindow).not.toHaveClass(/active/);
  });

});