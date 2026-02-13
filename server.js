// --- IMPORTATION DES OUTILS ---
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config(); // Pour lire les futurs secrets

// --- INITIALISATION DU SERVEUR ---
const app = express();
const PORT = 3000; // Le port sur lequel le serveur va écouter

// --- RÉGLAGES DE SÉCURITÉ ET DE FORMAT ---
app.use(cors()); // Autorise la communication
app.use(express.json()); // Permet au serveur de comprendre le format JSON

// --- 1. SERVIR LE RESTAURANT (Le Front-end) ---
// On dit au serveur de fournir les fichiers (HTML, CSS, JS, Images) à quiconque visite l'adresse
app.use(express.static(path.join(__dirname)));

// --- 2. LA PREMIÈRE ROUTE BACK-END (La Cuisine) ---
// C'est un exemple : si quelqu'un (ou votre code) tape à la porte "/api/test", le serveur répond ça :
app.get('/api/test', (req, res) => {
    res.json({ 
        message: "Bonjour de la part du Backend ! La cuisine d'Épicuvin est officiellement ouverte." 
    });
});

// --- ALLUMAGE DU SERVEUR ---
app.listen(PORT, () => {
    console.log(`🍷 Serveur Épicuvin démarré avec succès !`);
    console.log(`👉 Ouvrez votre navigateur sur : http://localhost:${PORT}`);
});