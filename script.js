// --- 1. IMPORTS FIREBASE (Version Web compatible navigateur) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- 2. TA CONFIGURATION FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAZQqueroo-GNWMVENm3c2-j0T8d7dpsjs",
  authDomain: "epicuvin.firebaseapp.com",
  projectId: "epicuvin",
  storageBucket: "epicuvin.firebasestorage.app",
  messagingSenderId: "57351192825",
  appId: "1:57351192825:web:c3763a02b2cae468bd2228",
  measurementId: "G-LN4MVN4DED"
};

// --- 3. INITIALISATION ---
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const winesCollection = collection(db, "vins");

// --- 4. VÉRIFICATION UTILISATEUR ---
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const auth = getAuth(app);
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user.email; // On utilise l'email comme identifiant de propriété
    initRealTimeListener();
  } else {
    window.location.href = "index.html";
  }
});

// Dans initRealTimeListener, remplacez loggedInUser par currentUser
const q = query(winesCollection, where("proprietaire", "==", currentUser));

// Pour la déconnexion
document.getElementById("logout-btn").addEventListener("click", () => {
  signOut(auth);
});

// --- VARIABLES GLOBALES ---
const form = document.getElementById("wine-form");
const tableBody = document.getElementById("wine-table-body");
let wineData = [];
let currentSort = { key: "", asc: true };
let currentSearch = "";

// --- GESTION DES NOTIFICATIONS (TOASTS) ---
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast${isError ? " error" : ""}`;
  toast.style.display = "block";

  setTimeout(() => {
    toast.classList.add("hide");
  }, 2500);

  setTimeout(() => {
    toast.style.display = "none";
    toast.classList.remove("hide", "error");
  }, 3000);
}

// --- 5. LECTURE EN TEMPS RÉEL (Remplaçant loadWines) ---
function initRealTimeListener() {
  document.getElementById("loader").style.display = "block";

  // Correction ici : utiliser currentUser
  const q = query(winesCollection, where("proprietaire", "==", currentUser));

  onSnapshot(q, (snapshot) => {
    wineData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    document.getElementById("loader").style.display = "none";
    applySorting();
  }, (error) => {
    console.error("Erreur de récupération:", error);
    showToast("Erreur de connexion à la base de données", true);
    document.getElementById("loader").style.display = "none";
  });
}

// --- 6. AJOUT ET MODIFICATION ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("wine-id").value;
  
  const wine = {
    nom: document.getElementById("name").value,
    annee: document.getElementById("year").value,
    quantite: document.getElementById("quantity").value,
    region: document.getElementById("region").value,
    commentaire: document.getElementById("commentaire").value,
    proprietaire: currentUser, // Correction ici : loggedInUser -> currentUser
    dateModification: new Date()
  };

  const loader = document.getElementById("loader");
  loader.style.display = "block";

  try {
    if (id) {
      // MODE MODIFICATION
      const wineRef = doc(db, "vins", id);
      await updateDoc(wineRef, wine);
      showToast("Vin modifié avec succès 🍷");
    } else {
      // MODE AJOUT
      // On ajoute la date de création seulement lors de l'ajout
      wine.dateCreation = new Date();
      await addDoc(winesCollection, wine);
      showToast("Vin ajouté avec succès 🍇");
    }
    
    // Reset du formulaire
    form.reset();
    document.getElementById("wine-id").value = "";
    
  } catch (error) {
    console.error("Erreur d'écriture:", error);
    showToast("Erreur : " + error.message, true);
  } finally {
    loader.style.display = "none";
  }
});

// --- 7. FONCTIONS D'AFFICHAGE ET TRI (Inchangées ou adaptées) ---
function applySorting() {
  if (currentSort.key) {
    wineData.sort((a, b) => {
      const valA = a[currentSort.key] || "";
      const valB = b[currentSort.key] || "";

      if (!isNaN(valA) && !isNaN(valB) && valA !== "" && valB !== "") {
        return currentSort.asc ? valA - valB : valB - valA;
      }
      return currentSort.asc
        ? valA.toString().localeCompare(valB.toString())
        : valB.toString().localeCompare(valA.toString());
    });
  }
  renderTable();
  updateHeaderArrows();
}

function renderTable() {
  tableBody.innerHTML = "";

  const filtered = wineData.filter(wine => {
    const combined = `${wine.nom} ${wine.annee} ${wine.quantite} ${wine.region} ${wine.commentaire}`.toLowerCase();
    return combined.includes(currentSearch.toLowerCase());
  });

  filtered.forEach(wine => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td data-label="Nom">${wine.nom}</td>
      <td data-label="Année">${wine.annee}</td>
      <td data-label="Quantité">${wine.quantite}</td>
      <td data-label="Région">${wine.region}</td>
      <td data-label="Commentaire">${wine.commentaire || "-"}</td>
      <td data-label="Actions">
        <button class="edit-btn">Modifier</button>
        <button class="delete-btn">Supprimer</button>
      </td>
    `;
    
    // Attachement des événements directement sur les boutons créés
    const editBtn = row.querySelector(".edit-btn");
    editBtn.addEventListener("click", () => editWine(wine));

    const deleteBtn = row.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", () => deleteWine(wine.id));

    tableBody.appendChild(row);
  });
}

function updateHeaderArrows() {
  document.querySelectorAll("th[data-key]").forEach(th => {
    const key = th.dataset.key;
    let label = th.textContent.replace(/[\u2191\u2193]/g, "").trim();
    if (key === currentSort.key) {
      label += currentSort.asc ? " ↑" : " ↓";
    }
    th.textContent = label;
  });
}

// --- 8. ACTIONS UTILISATEUR ---
function editWine(wine) {
  document.getElementById("wine-id").value = wine.id;
  document.getElementById("name").value = wine.nom;
  document.getElementById("year").value = wine.annee;
  document.getElementById("quantity").value = wine.quantite;
  document.getElementById("region").value = wine.region;
  document.getElementById("commentaire").value = wine.commentaire || "";
  
  // Scroll vers le formulaire sur mobile
  document.querySelector(".form-section").scrollIntoView({ behavior: "smooth" });
}

async function deleteWine(id) {
  if (confirm("Supprimer ce vin ?")) {
    const loader = document.getElementById("loader");
    loader.style.display = "block";
    try {
      await deleteDoc(doc(db, "vins", id));
      showToast("Vin supprimé avec succès ❌");
    } catch (error) {
      console.error("Erreur suppression:", error);
      showToast("Erreur lors de la suppression", true);
    } finally {
      loader.style.display = "none";
    }
  }
}

// --- LISTENERS GLOBAUX ---
document.querySelectorAll("th[data-key]").forEach(th => {
  th.addEventListener("click", () => {
    const key = th.dataset.key;
    const isAsc = currentSort.key === key ? !currentSort.asc : true;
    currentSort = { key, asc: isAsc };
    applySorting();
  });
});

document.getElementById("search-bar").addEventListener("input", (e) => {
  currentSearch = e.target.value;
  renderTable();
});

document.getElementById("logout-btn").addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  }).catch((error) => {
    console.error("Erreur déconnexion:", error);
  });
});

// Lancement de l'application
initRealTimeListener();