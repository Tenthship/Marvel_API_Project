const PUBLIC_KEY = "4e92e59271d186fccb8e69f81dbc0514";
const PRIVATE_KEY = "9d13392a6b244cc27da741b9070e8e60662adde2";

let currentType = "characters";
let currentQuery = "";
let offset = 0;
const limit = 12;

async function fetchMarvelData(type, query = "", append = false) {
  const ts = Date.now();
  const hash = CryptoJS.MD5(ts + PRIVATE_KEY + PUBLIC_KEY).toString();
  const baseUrl = `https://gateway.marvel.com/v1/public/${type}`;
  const searchParam = query ? (type === "characters" ? `?nameStartsWith=${encodeURIComponent(query)}` : `?titleStartsWith=${encodeURIComponent(query)}`) : "?";
  const url = `${baseUrl}${searchParam}&limit=${limit}&offset=${offset}&ts=${ts}&apikey=${PUBLIC_KEY}&hash=${hash}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Marvel API request failed");
  const json = await res.json();
  renderResults(type, json.data.results, append);
}

function renderResults(type, results, append) {
  const dataDiv = document.getElementById("dataDiv");
  if (!append) dataDiv.innerHTML = "";

  if (!results.length && !append) {
    dataDiv.innerHTML = "<p>No results found.</p>";
    return;
  }

  results.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";
    if (type === "characters") {
      card.innerHTML = `
        <img src="${item.thumbnail.path}.${item.thumbnail.extension}" alt="${item.name}" />
        <h2>${item.name}</h2>
      `;
      card.addEventListener("click", () => openCharacterModal(item));
    } else if (type === "comics") {
      card.innerHTML = `
        <img src="${item.thumbnail.path}.${item.thumbnail.extension}" alt="${item.title}" />
        <h3>${item.title}</h3>
      `;
      card.addEventListener("click", () => openComicModal(item));
    }
    dataDiv.appendChild(card);
  });
}

function openCharacterModal(character) {
  const modal = getModal();
  modal.querySelector(".modal-body").innerHTML = `
    <img src="${character.thumbnail.path}.${character.thumbnail.extension}" alt="${character.name}" />
    <h2>${character.name}</h2>
    <p>${character.description || "No description available."}</p>
    <button class="favorite-btn" onclick="toggleFavorite('characters', ${character.id}, '${character.name}', '${character.thumbnail.path}.${character.thumbnail.extension}')">
      ${isFavorite("characters", character.id) ? "Remove from Favorites" : "Add to Favorites"}
    </button>
    <h3>Appears in Comics:</h3>
    <ul>${character.comics.items.slice(0,5).map(c => `<li>${c.name}</li>`).join("")}</ul>
  `;
  showModal();
}

function openComicModal(comic) {
  const modal = getModal();
  modal.querySelector(".modal-body").innerHTML = `
    <img src="${comic.thumbnail.path}.${comic.thumbnail.extension}" alt="${comic.title}" />
    <h2>${comic.title}</h2>
    <p>Issue #: ${comic.issueNumber || "N/A"}</p>
    <p>${comic.description || "No description available."}</p>
    <button class="favorite-btn" onclick="toggleFavorite('comics', ${comic.id}, '${comic.title}', '${comic.thumbnail.path}.${comic.thumbnail.extension}')">
      ${isFavorite("comics", comic.id) ? "Remove from Favorites" : "Add to Favorites"}
    </button>
  `;
  showModal();
}

function getModal() {
  let modal = document.querySelector(".modal");
  if (!modal.innerHTML) {
    modal.innerHTML = `
      <div class="modal-content">
        <span class="modal-close">&times;</span>
        <div class="modal-body"></div>
      </div>
    `;
    modal.querySelector(".modal-close").addEventListener("click", hideModal);
    modal.addEventListener("click", e => { if (e.target === modal) hideModal(); });
  }
  return modal;
}

function showModal() {
  document.querySelector(".modal").classList.add("active");
}
function hideModal() {
  document.querySelector(".modal").classList.remove("active");
}

// Favorites
function getFavorites() {
  return JSON.parse(localStorage.getItem("favorites") || "{}");
}
function isFavorite(type, id) {
  const favs = getFavorites();
  return favs[type]?.some(f => f.id === id);
}
function toggleFavorite(type, id, name, img) {
  const favs = getFavorites();
  if (!favs[type]) favs[type] = [];
  if (isFavorite(type, id)) {
    favs[type] = favs[type].filter(f => f.id !== id);
  } else {
    favs[type].push({ id, name, img });
  }
  localStorage.setItem("favorites", JSON.stringify(favs));
  hideModal();
  if (currentType === "favorites") showFavorites();
}

function showFavorites() {
  const favs = getFavorites();
  const items = [...(favs.characters || []), ...(favs.comics || [])];
  renderResults("characters", [], false);
  const dataDiv = document.getElementById("dataDiv");
  if (!items.length) {
    dataDiv.innerHTML = "<p>No favorites yet.</p>";
    return;
  }
  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${item.img}" alt="${item.name}" />
      <h2>${item.name}</h2>
    `;
    dataDiv.appendChild(card);
  });
}

// Theme toggle
document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
});

// Search
document.getElementById("inputButton").addEventListener("click", () => {
  currentQuery = document.getElementById("marvelInput").value.trim();
  offset = 0;
  if (currentType === "favorites") {
    showFavorites();
  } else {
    fetchMarvelData(currentType, currentQuery);
  }
});
document.getElementById("marvelInput").addEventListener("keypress", e => {
  if (e.key === "Enter") document.getElementById("inputButton").click();
});

// Tabs
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentType = btn.dataset.type;
    offset = 0;
    currentQuery = "";
    document.getElementById("marvelInput").value = "";
    if (currentType === "favorites") {
      showFavorites();
    } else {
      fetchMarvelData(currentType);
    }
  });
});

// Load more
document.getElementById("loadMoreBtn").addEventListener("click", () => {
  offset += limit;
  if (currentType !== "favorites") {
    fetchMarvelData(currentType, currentQuery, true);
  }
});

// Initial load
fetchMarvelData("characters");
