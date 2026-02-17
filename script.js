// ==========================================
// 1. IMPORTS FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { 
  getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, query, where, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ==========================================
// 2. CONFIGURATION FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyAZQqueroo-GNWMVENm3c2-j0T8d7dpsjs",
  authDomain: "epicuvin.firebaseapp.com",
  projectId: "epicuvin",
  storageBucket: "epicuvin.firebasestorage.app",
  messagingSenderId: "57351192825",
  appId: "1:57351192825:web:c3763a02b2cae468bd2228",
  measurementId: "G-LN4MVN4DED"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const winesCollection = collection(db, "vins");
const degustationsCollection = collection(db, "degustations");
let degustationData = [];

// ==========================================
// 3. VARIABLES GLOBALES & ÉLÉMENTS DOM
// ==========================================
let wineData = [];
let currentSearch = "";
let currentUser = null;
let currentUserId = null;

const profileModal = document.getElementById("profile-modal");
const profileForm = document.getElementById("profile-form");
const form = document.getElementById("wine-form");
const wineGrid = document.getElementById("wine-grid");
const modal = document.getElementById("wine-modal");
const loader = document.getElementById("loader");
const tabCave = document.getElementById("tab-cave");
const tabHistory = document.getElementById("tab-history");
const historyGrid = document.getElementById("history-grid");
const degustationModal = document.getElementById("degustation-modal");
const degustationForm = document.getElementById("degustation-form");
let currentWineForDegustation = null;

// ==========================================
// GESTION DES ONGLETS (Cave vs Historique)
// ==========================================
tabCave.addEventListener("click", () => {
  tabCave.classList.add("active");
  tabHistory.classList.remove("active");
  wineGrid.style.display = "grid";
  historyGrid.style.display = "none";
});

tabHistory.addEventListener("click", () => {
  tabHistory.classList.add("active");
  tabCave.classList.remove("active");
  wineGrid.style.display = "none";
  historyGrid.style.display = "grid";
});

// ==========================================
// 4. AUTHENTIFICATION & DÉCONNEXION
// ==========================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user.email; 
    currentUserId = user.uid;
    initRealTimeListener();
    loadUserProfile();
  } else {
    window.location.href = "index.html";
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  }).catch((error) => console.error("Erreur déconnexion:", error));
});

// ==========================================
// 5. GESTION DE LA MODALE
// ==========================================
document.getElementById("open-modal-btn").addEventListener("click", () => {
  form.reset();
  document.getElementById("wine-id").value = "";
  document.getElementById("modal-title").textContent = "Entrer un nouveau vin";
  modal.classList.add("active");
});

document.getElementById("close-modal-btn").addEventListener("click", () => {
  modal.classList.remove("active");
});

// Fermer en cliquant en dehors de la boîte
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.remove("active");
});

// ==========================================
// 6. SYSTÈME DE NOTIFICATIONS (TOASTS)
// ==========================================
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast${isError ? " error" : ""}`;
  toast.style.display = "block";

  setTimeout(() => toast.classList.add("hide"), 2500);
  setTimeout(() => {
    toast.style.display = "none";
    toast.classList.remove("hide", "error");
  }, 3000);
}

// ==========================================
// 7. LECTURE DE LA CAVE EN TEMPS RÉEL
// ==========================================
function initRealTimeListener() {
  loader.style.display = "block";

  // Écoute de la Cave
  const qVins = query(winesCollection, where("proprietaire", "==", currentUser));
  onSnapshot(qVins, (snapshot) => {
    wineData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    wineData.sort((a, b) => a.nom.localeCompare(b.nom));
    loader.style.display = "none";
    renderGrid();
  });

  // Écoute de l'Historique de Dégustation
  const qDegust = query(degustationsCollection, where("proprietaire", "==", currentUser));
  onSnapshot(qDegust, (snapshot) => {
    degustationData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Trier du plus récent au plus ancien
    degustationData.sort((a, b) => b.dateDegustation.toMillis() - a.dateDegustation.toMillis());
    renderHistory();
  });
}

// ==========================================
// 8. AJOUT ET MODIFICATION D'UN VIN
// ==========================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("wine-id").value;
  
  const wine = {
    nom: document.getElementById("name").value,
    type: document.getElementById("type").value,
    annee: document.getElementById("year").value,
    appellation: document.getElementById("appellation").value,
    region: document.getElementById("region").value,
    cepage: document.getElementById("cepage").value,
    format: document.getElementById("format").value,
    quantite: parseInt(document.getElementById("quantity").value) || 0,
    apogeeDebut: document.getElementById("apogee-debut").value,
    apogeeFin: document.getElementById("apogee-fin").value,
    commentaire: document.getElementById("commentaire").value,
    proprietaire: currentUser,
    dateModification: new Date()
  };

  loader.style.display = "block";
  modal.classList.remove("active"); // On ferme la modale pendant l'enregistrement

  try {
    if (id) {
      const wineRef = doc(db, "vins", id);
      await updateDoc(wineRef, wine);
      showToast("Vin mis à jour avec succès");
    } else {
      wine.dateCreation = new Date();
      await addDoc(winesCollection, wine);
      showToast("Nouveau vin ajouté à la cave");
    }
    form.reset();
  } catch (error) {
    console.error("Erreur d'écriture:", error);
    showToast("Erreur lors de l'enregistrement", true);
    modal.classList.add("active"); // On réouvre la modale en cas d'erreur
  } finally {
    loader.style.display = "none";
  }
});

// ==========================================
// 9. AFFICHAGE DES CARTES DE DÉGUSTATION
// ==========================================
function renderGrid() {
  wineGrid.innerHTML = "";
  let totalBouteilles = 0;

  // Filtrage par la barre de recherche
  const filtered = wineData.filter(wine => {
    const combined = `${wine.nom} ${wine.annee} ${wine.region} ${wine.appellation || ""} ${wine.cepage || ""}`.toLowerCase();
    return combined.includes(currentSearch.toLowerCase());
  });

  filtered.forEach(wine => {
    totalBouteilles += parseInt(wine.quantite) || 0;

    // Définition de la couleur de la pastille selon le type
    let typeColor = "#A89B8C"; // Défaut
    if (wine.type === "Rouge") typeColor = "#8B1C31"; // Rouge sombre
    if (wine.type === "Blanc") typeColor = "#F4E0A1"; // Or clair
    if (wine.type === "Rosé") typeColor = "#F1A7A9"; // Rosé
    if (wine.type === "Effervescent") typeColor = "#E8D595"; // Champagne
    if (wine.type === "Liquoreux") typeColor = "#D4AF37"; // Or profond
    if (wine.type === "Muté") typeColor = "#5A1220"; // Rubis très sombre

    // Création de la carte HTML
    const card = document.createElement("div");
    card.className = "wine-card";
    
    card.innerHTML = `
      <div class="card-header">
        <span class="wine-type-dot" style="background-color: ${typeColor};" title="${wine.type || 'Inconnu'}"></span>
        <span class="wine-year">${wine.annee || "NV"}</span>
      </div>
      <div class="card-body">
        <h3>${wine.nom}</h3>
        <p class="appellation">${wine.appellation || wine.region}</p>
        <div class="wine-details">
          <span>${wine.format || "Bouteille (75cl)"}</span>
          <span class="stock-badge">${wine.quantite} en cave</span>
        </div>
        ${wine.apogeeDebut ? `<p class="apogee">⏳ Garde : ${wine.apogeeDebut} - ${wine.apogeeFin || '...'}</p>` : ''}
      </div>
      <div class="card-actions">
        <button class="taste-btn">Déguster</button>
        <button class="edit-btn">Modifier</button>
        <button class="delete-btn">Retirer</button>
      </div>
      card.querySelector(".taste-btn").addEventListener("click", () => openDegustation(wine));
    card.querySelector(".edit-btn").addEventListener("click", () => editWine(wine));
    card.querySelector(".delete-btn").addEventListener("click", () => deleteWine(wine.id));
    `;
    
    // Attachement des événements (Modifier / Retirer)
    card.querySelector(".edit-btn").addEventListener("click", () => editWine(wine));
    card.querySelector(".delete-btn").addEventListener("click", () => deleteWine(wine.id));

    wineGrid.appendChild(card);
  });

  // Mise à jour du titre du tableau de bord
  document.getElementById("cellar-title").innerHTML = `Ma Cave <span>(${totalBouteilles} bouteilles)</span>`;
}

// ==========================================
// 10. ACTIONS (Remplir Formulaire / Supprimer)
// ==========================================
function editWine(wine) {
  // Remplissage des champs
  document.getElementById("wine-id").value = wine.id;
  document.getElementById("name").value = wine.nom;
  document.getElementById("type").value = wine.type || "";
  document.getElementById("year").value = wine.annee;
  document.getElementById("appellation").value = wine.appellation || "";
  document.getElementById("region").value = wine.region || "";
  document.getElementById("cepage").value = wine.cepage || "";
  document.getElementById("format").value = wine.format || "Bouteille (75cl)";
  document.getElementById("quantity").value = wine.quantite;
  document.getElementById("apogee-debut").value = wine.apogeeDebut || "";
  document.getElementById("apogee-fin").value = wine.apogeeFin || "";
  document.getElementById("commentaire").value = wine.commentaire || "";
  
  // Ouverture de la modale
  document.getElementById("modal-title").textContent = "Modifier ce vin";
  modal.classList.add("active");
}

async function deleteWine(id) {
  if (confirm("Voulez-vous retirer ce vin de votre cave ?")) {
    loader.style.display = "block";
    try {
      await deleteDoc(doc(db, "vins", id));
      showToast("Vin retiré de la cave");
    } catch (error) {
      console.error("Erreur suppression:", error);
      showToast("Erreur lors du retrait", true);
    } finally {
      loader.style.display = "none";
    }
  }
}

// ==========================================
// 11. BARRE DE RECHERCHE
// ==========================================
document.getElementById("search-bar").addEventListener("input", (e) => {
  currentSearch = e.target.value;
  renderGrid(); // Filtre en temps réel
});

// ==========================================
// 12. GESTION DU PROFIL UTILISATEUR
// ==========================================
document.getElementById("profile-btn").addEventListener("click", () => {
  profileModal.classList.add("active");
});

document.getElementById("close-profile-btn").addEventListener("click", () => {
  profileModal.classList.remove("active");
});

profileModal.addEventListener("click", (e) => {
  if (e.target === profileModal) profileModal.classList.remove("active");
});

// Récupérer les données depuis Firebase
async function loadUserProfile() {
  if (!currentUserId) return;
  try {
    const userDoc = await getDoc(doc(db, "users", currentUserId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      document.getElementById("profile-prenom").value = data.prenom || "";
      document.getElementById("profile-nom").value = data.nom || "";
      document.getElementById("profile-telephone").value = data.telephone || "";
      document.getElementById("profile-email").value = data.email || currentUser;
    } else {
      document.getElementById("profile-email").value = currentUser;
    }
  } catch (error) {
    console.error("Erreur chargement profil:", error);
  }
}

// Mettre à jour les données dans Firebase
profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const updatedData = {
    prenom: document.getElementById("profile-prenom").value,
    nom: document.getElementById("profile-nom").value,
    telephone: document.getElementById("profile-telephone").value,
  };

  loader.style.display = "block";
  profileModal.classList.remove("active");

try {
    // Remplacez l'ancienne ligne updateDoc par celle-ci :
    await setDoc(doc(db, "users", currentUserId), updatedData, { merge: true });
    showToast("Profil mis à jour avec succès");
  } catch (error) {
    console.error("Erreur mise à jour profil:", error);
    showToast("Erreur lors de la mise à jour", true);
    profileModal.classList.add("active");
  } finally {
    loader.style.display = "none";
  }
});

// ==========================================
// 13. LIVRE DE CAVE : LOGIQUE DÉGUSTATION
// ==========================================
function openDegustation(wine) {
  currentWineForDegustation = wine;
  document.getElementById("degustation-title").textContent = `Déguster : ${wine.nom}`;
  document.getElementById("degustation-qty").max = wine.quantite; // Maximum = stock actuel
  document.getElementById("degustation-qty").value = 1;
  document.getElementById("degustation-comment").value = "";
  degustationModal.classList.add("active");
}

document.getElementById("close-degustation-btn").addEventListener("click", () => {
  degustationModal.classList.remove("active");
});

degustationForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const qtyBue = parseInt(document.getElementById("degustation-qty").value);
  const comment = document.getElementById("degustation-comment").value;
  const rating = parseInt(document.querySelector('input[name="rating"]:checked').value);

  if(qtyBue > currentWineForDegustation.quantite) {
    showToast("Vous n'avez pas autant de bouteilles en cave !", true);
    return;
  }

  loader.style.display = "block";
  degustationModal.classList.remove("active");

  try {
    // 1. Créer l'archive dans l'historique
    await addDoc(degustationsCollection, {
      wineId: currentWineForDegustation.id,
      nom: currentWineForDegustation.nom,
      annee: currentWineForDegustation.annee || "NV",
      region: currentWineForDegustation.region || "Inconnue",
      type: currentWineForDegustation.type || "Inconnu",
      quantiteBue: qtyBue,
      note: rating,
      commentaire: comment,
      proprietaire: currentUser,
      dateDegustation: new Date()
    });

    // 2. Déduire de la cave
    const remainingQty = currentWineForDegustation.quantite - qtyBue;
    if (remainingQty <= 0) {
      await deleteDoc(doc(db, "vins", currentWineForDegustation.id));
      showToast("Bouteille terminée ! Vin retiré de la cave.");
    } else {
      await updateDoc(doc(db, "vins", currentWineForDegustation.id), { quantite: remainingQty });
      showToast(`Dégustation notée. Reste ${remainingQty} bouteille(s).`);
    }
  } catch (error) {
    console.error("Erreur dégustation:", error);
    showToast("Erreur lors de l'enregistrement", true);
  } finally {
    loader.style.display = "none";
  }
});

function renderHistory() {
  historyGrid.innerHTML = "";
  
  if (degustationData.length === 0) {
    historyGrid.innerHTML = "<p style='color:#A89B8C; grid-column: 1 / -1; text-align: center;'>Votre livre de cave est vide. Ouvrez une bouteille !</p>";
    return;
  }

  degustationData.forEach(degust => {
    // Transformer la note (ex: 4) en étoiles dorées et vides
    const stars = "★".repeat(degust.note) + "☆".repeat(5 - degust.note);
    const dateStr = degust.dateDegustation.toDate().toLocaleDateString('fr-FR');

    const card = document.createElement("div");
    card.className = "wine-card history-card";
    
    card.innerHTML = `
      <div class="card-header">
        <span class="history-date">📅 Dégusté le ${dateStr}</span>
        <span class="wine-year">${degust.annee}</span>
      </div>
      <div class="card-body">
        <h3>${degust.nom}</h3>
        <p class="appellation">${degust.region}</p>
        <div class="history-stars" title="${degust.note}/5">${stars}</div>
        <div class="history-comment">"${degust.commentaire}"</div>
        <p style="margin-top:10px; font-size: 0.8rem; color:#A89B8C;">
          🍷 ${degust.quantiteBue} bouteille(s) ouverte(s)
        </p>
      </div>
    `;
    historyGrid.appendChild(card);
  });
}

// ==========================================
// 14. LE SOMMELIER VIRTUEL (IA)
// ==========================================
const chatbotToggle = document.getElementById("chatbot-toggle");
const chatbotWindow = document.getElementById("chatbot-window");
const chatbotClose = document.getElementById("chatbot-close");
const chatbotSendBtn = document.getElementById("chatbot-send");
const chatbotInputField = document.getElementById("chatbot-input-field");
const chatbotMessages = document.getElementById("chatbot-messages");

// Remplacer par l'URL de votre fonction Firebase !
const BACKEND_URL = "https://us-central1-epicuvin.cloudfunctions.net/api/sommelier"; 

// Ouvrir/Fermer la fenêtre
chatbotToggle.addEventListener("click", () => chatbotWindow.classList.add("active"));
chatbotClose.addEventListener("click", () => chatbotWindow.classList.remove("active"));

// Ajouter un message dans la boîte
function appendMessage(text, sender) {
  const div = document.createElement("div");
  div.className = `message ${sender}`;
  div.textContent = text;
  chatbotMessages.appendChild(div);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight; // Scroll vers le bas
}

// Envoyer la demande à Gemini
async function askSommelier() {
  const text = chatbotInputField.value.trim();
  if (!text) return;

  // 1. Afficher le message de l'utilisateur
  appendMessage(text, "user");
  chatbotInputField.value = "";
  
  // Petit message d'attente
  appendMessage("...", "bot");
  const loadingMessage = chatbotMessages.lastChild;

  try {
    // 2. Envoi de la demande ET de la cave (wineData) au Backend
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        cellar: wineData // Le tableau qui contient tous vos vins !
      })
    });

    const data = await response.json();
    
    // 3. Remplacer "..." par la vraie réponse
    chatbotMessages.removeChild(loadingMessage);
    appendMessage(data.reply, "bot");

  } catch (error) {
    chatbotMessages.removeChild(loadingMessage);
    appendMessage("Erreur de connexion avec la cave.", "bot");
  }
}

chatbotSendBtn.addEventListener("click", askSommelier);
chatbotInputField.addEventListener("keypress", (e) => {
  if (e.key === "Enter") askSommelier();
});