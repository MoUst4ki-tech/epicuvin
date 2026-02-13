const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");

// --- INITIALISATION DU SERVEUR ---
const app = express();

// --- RÉGLAGES DE SÉCURITÉ ---
// On autorise toutes les requêtes (votre Front-end) à parler à votre Backend
app.use(cors({ origin: true }));
app.use(express.json());

// --- LA ROUTE DU SOMMELIER (L'API) ---
app.get('/test', (req, res) => {
    res.json({ 
        message: "🍷 Bonjour depuis le Cloud ! La cuisine d'Épicuvin est officiellement ouverte et sécurisée." 
    });
});

// --- EXPORTATION POUR FIREBASE ---
// C'est ici qu'on dit à Firebase de transformer notre application Express en Cloud Function
exports.api = functions.https.onRequest(app);