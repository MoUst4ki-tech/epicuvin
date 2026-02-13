// ==========================================
// 1. IMPORTS FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { 
  getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, query, where 
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

// ==========================================
// 3. VARIABLES GLOBALES & ÉLÉMENTS DOM
// ==========================================
let wineData = [];
let currentSearch = "";
let currentUser = null;

const form = document.getElementById("wine-form");
const wineGrid = document.getElementById("wine-grid");
const modal = document.getElementById("wine-modal");
const loader = document.getElementById("loader");

// ==========================================
// 4. AUTHENTIFICATION & DÉCONNEXION
// ==========================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user.email; 
    initRealTimeListener();
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

  const q = query(winesCollection, where("proprietaire", "==", currentUser));

  onSnapshot(q, (snapshot) => {
    wineData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Tri alphabétique par défaut sur le nom du vin
    wineData.sort((a, b) => a.nom.localeCompare(b.nom));
    
    loader.style.display = "none";
    renderGrid();
  }, (error) => {
    console.error("Erreur de récupération:", error);
    showToast("Erreur de connexion à la cave", true);
    loader.style.display = "none";
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
        <button class="edit-btn">Modifier</button>
        <button class="delete-btn">Retirer</button>
      </div>
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