// --- 1. IMPORTS FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { 
  getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, query, where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- 2. CONFIGURATION FIREBASE ---
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
const auth = getAuth(app);
const winesCollection = collection(db, "vins");

// --- 4. VARIABLES GLOBALES ---
const form = document.getElementById("wine-form");
const tableBody = document.getElementById("wine-table-body");
let wineData = [];
let currentSort = { key: "", asc: true };
let currentSearch = "";
let currentUser = null;

// --- 5. GESTION DE L'AUTHENTIFICATION ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    // L'utilisateur est connecté, on enregistre son email et on charge SES vins
    currentUser = user.email; 
    initRealTimeListener();
  } else {
    // Pas d'utilisateur : retour à la page de connexion
    window.location.href = "index.html";
  }
});

// Déconnexion
document.getElementById("logout-btn").addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  }).catch((error) => {
    console.error("Erreur déconnexion:", error);
  });
});

// --- 6. GESTION DES NOTIFICATIONS (TOASTS) ---
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast${isError ? " error" : ""}`;
  toast.style.display = "block";

  setTimeout(() => { toast.classList.add("hide"); }, 2500);
  setTimeout(() => {
    toast.style.display = "none";
    toast.classList.remove("hide", "error");
  }, 3000);
}

// --- 7. LECTURE EN TEMPS RÉEL ---
function initRealTimeListener() {
  document.getElementById("loader").style.display = "block";

  // On demande à Firestore uniquement les vins de l'utilisateur connecté
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

// --- 8. AJOUT ET MODIFICATION ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("wine-id").value;
  
  const wine = {
    nom: document.getElementById("name").value,
    annee: document.getElementById("year").value,
    quantite: document.getElementById("quantity").value,
    region: document.getElementById("region").value,
    commentaire: document.getElementById("commentaire").value,
    proprietaire: currentUser, // Attribué automatiquement à l'email en cours
    dateModification: new Date()
  };

  const loader = document.getElementById("loader");
  loader.style.display = "block";

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
    document.getElementById("wine-id").value = "";
    
  } catch (error) {
    console.error("Erreur d'écriture:", error);
    showToast("Erreur lors de l'enregistrement", true);
  } finally {
    loader.style.display = "none";
  }
});

// --- 9. FONCTIONS D'AFFICHAGE ET TRI ---
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
        <button class="delete-btn">Retirer</button>
      </td>
    `;
    
    row.querySelector(".edit-btn").addEventListener("click", () => editWine(wine));
    row.querySelector(".delete-btn").addEventListener("click", () => deleteWine(wine.id));

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

// --- 10. ACTIONS UTILISATEUR (Modification / Suppression) ---
function editWine(wine) {
  document.getElementById("wine-id").value = wine.id;
  document.getElementById("name").value = wine.nom;
  document.getElementById("year").value = wine.annee;
  document.getElementById("quantity").value = wine.quantite;
  document.getElementById("region").value = wine.region;
  document.getElementById("commentaire").value = wine.commentaire || "";
  
  document.querySelector(".form-section").scrollIntoView({ behavior: "smooth" });
}

async function deleteWine(id) {
  if (confirm("Voulez-vous retirer ce vin de votre cave ?")) {
    const loader = document.getElementById("loader");
    loader.style.display = "block";
    try {
      await deleteDoc(doc(db, "vins", id));
      showToast("Vin retiré de la cave");
    } catch (error) {
      console.error("Erreur suppression:", error);
      showToast("Erreur lors de la suppression", true);
    } finally {
      loader.style.display = "none";
    }
  }
}

// --- 11. LISTENERS GLOBAUX ---
document.querySelectorAll("th[data-key]").forEach(th => {
  th.addEventListener("click", () => {
    const key = th.dataset.key;
    currentSort = { key, asc: currentSort.key === key ? !currentSort.asc : true };
    applySorting();
  });
});

document.getElementById("search-bar").addEventListener("input", (e) => {
  currentSearch = e.target.value;
  renderTable();
});