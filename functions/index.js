const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Initialisation du cerveau Gemini avec votre clé secrète
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- LA ROUTE DU SOMMELIER ---
app.post('/sommelier', async (req, res) => {
    try {
        const userMessage = req.body.message;
        const userCellar = req.body.cellar; // La cave envoyée par le site

        if (!userMessage || !userCellar) {
            return res.status(400).json({ error: "Message ou cave manquante." });
        }

        // Le "Prompt Système" qui définit la personnalité du chatbot
        const prompt = `
Tu es le Sommelier personnel et virtuel de l'application "Épicuvin".
Ton ton est élégant, courtois, expert et chaleureux, digne d'un grand restaurant.
Voici la cave actuelle de l'utilisateur (en format JSON) :
${JSON.stringify(userCellar)}

L'utilisateur te demande : "${userMessage}"

Ta mission : 
1. Recommander le meilleur vin DISPONIBLE dans sa cave pour répondre à sa demande.
2. Expliquer brièvement (2 ou 3 phrases) pourquoi cet accord est parfait.
3. Si la cave est vide ou si aucun vin ne correspond parfaitement, propose une alternative proche parmi ses vins.
Fais des réponses concises, naturelles, sans utiliser trop de formatage (évite le gras excessif).
`;

        // Appel à l'IA
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // On renvoie la réponse au site
        res.json({ reply: responseText });

    } catch (error) {
        console.error("Erreur Gemini:", error);
        res.status(500).json({ reply: "Pardonnez-moi, je dois retourner en cave un instant. Veuillez réessayer." });
    }
});

exports.api = functions.https.onRequest(app);