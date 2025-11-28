// =======================
// CONFIG
// =======================

const JSON_URLS = [
  "/assets/recommendations/hungary/budapest/budapest_route_FD_art_recommendations.json",
  "/assets/recommendations/hungary/budapest/budapest_route_FD_history_recommendations.json",
  "/assets/recommendations/hungary/budapest/budapest_route_FD_mixed_recommendations.json",
  "/assets/recommendations/hungary/budapest/budapest_route_FD_nature_recommendations.json",
  "/assets/recommendations/hungary/budapest/budapest_route_FD_nightlife_recommendations.json",
  "/assets/recommendations/hungary/budapest/budapest_route_HD_art_recommendations.json",
  "/assets/recommendations/hungary/budapest/budapest_route_HD_history_recommendations.json",
  "/assets/recommendations/hungary/budapest/budapest_route_HD_mixed_recommendations.json",
  "/assets/recommendations/hungary/budapest/budapest_route_HD_nature_recommendations.json",
  "/assets/recommendations/hungary/budapest/budapest_route_HD_nightlife_recommendations.json"
];

const FOOD_JSON_URL = "/assets/recommendations/hungary/budapest/budapest_food_recommendations.json";

let foodRecommendations = null;
let foodLoaded = false;

const icons = {
  interest: {
    history: "🏰",
    art: "🎨",
    nature: "🌿",
    nightlife: "🍸",
    mixed: "🔀"
  },
  food: {
    local_specialties: "🍲",
    light_veggie: "🥗",
    try_everything: "🍽️"
  },
  budget: {
    low: "💸",
    medium: "💶",
    high: "💎",
    comfortable: "💎"
  },
  tripType: {
    full_day: "🕒",
    half_day: "⏱️"
    // optionally other types if you add them
  }
};

let routeRecommendations = [];
let routesLoaded = false;
let routesLoadError = null;

function formatOptionLabel(str) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// =======================
// LOAD JSON
// =======================

function flattenRecommendations(data) {
  const result = [];

  Object.keys(data).forEach(duration => {
    const interests = data[duration];
    Object.keys(interests).forEach(interest => {
      const foods = interests[interest];
      Object.keys(foods).forEach(food => {
        const budgets = foods[food];
        Object.keys(budgets).forEach(budget => {
          const entry = budgets[budget];
          result.push({
            tripType: duration,
            interest,
            food,
            budget,
            recommendation: entry
          });
        });
      });
    });
  });

  return result;
}

function loadFoodRecommendations() {
  return fetch(FOOD_JSON_URL)
    .then(res => {
      if (!res.ok) throw new Error("Food JSON not found: " + FOOD_JSON_URL);
      return res.json();
    })
    .then(data => {
      foodRecommendations = data;
      foodLoaded = true;
      console.info("[Budapest food] Loaded");
    })
    .catch(err => {
      console.error("Food load error:", err);
    });
}

function loadRouteRecommendations() {
  const fetches = JSON_URLS.map(url =>
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load JSON: " + url + " status: " + res.status);
        return res.json();
      })
  );

  return Promise.all(fetches)
    .then(jsonArray => {
      jsonArray.forEach(json => {
        const flattened = flattenRecommendations(json);
        routeRecommendations = routeRecommendations.concat(flattened);
      });
      routesLoaded = true;
      console.info("[Budapest routes] Loaded", routeRecommendations.length, "routes.");

      const countEl = document.getElementById("routes-loaded-count");
      if (countEl) {
        countEl.textContent = `🔄 Loaded ${routeRecommendations.length} route suggestions`;
      }
    })
    .catch(err => {
      routesLoadError = err;
      console.error("Route load error:", err);
    });
}

// =======================
// UI UTILITIES
// =======================

function buildResultCard(data) {
  const { tripType, interest, food, budget, recommendation } = data;

  const card = document.createElement("div");
  card.className = "card route-card";

  const iconsRow = [
    icons.tripType[tripType],
    icons.interest[interest],
    icons.food[food],
    icons.budget[budget] || ""
  ].filter(Boolean).join(" ");

  let html = `<strong>${recommendation.title}</strong><br><em>${recommendation.summary}</em><br><br>`;
  if (Array.isArray(recommendation.schedule)) {
    recommendation.schedule.forEach(item => {
      html += `<strong>${item.time} — ${item.title}</strong><br>${item.description}<br><br>`;
    });
  }

  card.innerHTML = `
    <div class="route-card-icon">${iconsRow}</div>
    <div class="card-text">
      <h3>${formatOptionLabel(interest)} • ${formatOptionLabel(food)} • ${formatOptionLabel(budget)}</h3>
      <p>${html}</p>
    </div>
  `;

  return card;
}

// =======================
// DROPDOWN POPULATION
// =======================

function populateDropdowns() {
  const tripSelect = document.getElementById("route-trip-type");
  const interestSelect = document.getElementById("route-interest");
  const foodSelect = document.getElementById("route-food");
  const budgetSelect = document.getElementById("route-budget");

  if (!tripSelect || !interestSelect || !foodSelect || !budgetSelect) return;

  const uniq = arr => [...new Set(arr)].sort();

  const tripTypes = uniq(routeRecommendations.map(r => r.tripType));
  tripSelect.innerHTML = `<option value="">-- Select trip type --</option>` +
    tripTypes.map(v => `<option value="${v}">${formatOptionLabel(v)}</option>`).join("");

  const interests = uniq(routeRecommendations.map(r => r.interest));
  interestSelect.innerHTML = `<option value="">-- Select interest --</option>` +
    interests.map(v => `<option value="${v}">${formatOptionLabel(v)}</option>`).join("");

  const foods = uniq(routeRecommendations.map(r => r.food));
  foodSelect.innerHTML = `<option value="">-- Select food type --</option>` +
    foods.map(v => `<option value="${v}">${formatOptionLabel(v)}</option>`).join("");

  const budgets = uniq(routeRecommendations.map(r => r.budget));
  budgetSelect.innerHTML = `<option value="">-- Select budget --</option>` +
    budgets.map(v => `<option value="${v}">${formatOptionLabel(v)}</option>`).join("");
}

// =======================
// INIT & EVENT HANDLERS
// =======================

document.addEventListener("DOMContentLoaded", () => {
  const tripSelect = document.getElementById("route-trip-type");
  const interestSelect = document.getElementById("route-interest");
  const foodSelect = document.getElementById("route-food");
  const budgetSelect = document.getElementById("route-budget");

  const submitBtn = document.getElementById("route-submit");
  const errorEl = document.getElementById("route-error");
  const resultContainer = document.getElementById("route-result");
  const pdfBtn = document.getElementById("save-pdf-btn");

  submitBtn.disabled = true;

  loadRouteRecommendations()
    .then(() => loadFoodRecommendations())
    .then(() => {
      if (!routesLoadError) {
        populateDropdowns();
        submitBtn.disabled = false;
      }
    });

  submitBtn.addEventListener("click", () => {
    errorEl.textContent = "";
    resultContainer.innerHTML = "";
    pdfBtn.style.display = "none";

    const t = tripSelect.value;
    const i = interestSelect.value;
    const f = foodSelect.value;
    const b = budgetSelect.value;

    if (!t || !i || !f || !b) {
      errorEl.textContent = "Molim te izaberi sve opcije.";
      return;
    }

    if (routesLoadError) {
      errorEl.textContent = "Greška pri učitavanju ruta.";
      return;
    }
    if (!routesLoaded) {
      errorEl.textContent = "Rute se još učitavaju...";
      return;
    }

    const match = routeRecommendations.find(r =>
      r.tripType === t &&
      r.interest === i &&
      r.food === f &&
      r.budget === b
    );

    if (match) {
      resultContainer.appendChild(buildResultCard(match));
    } else {
      errorEl.textContent = "Nema preporuke za izabranu kombinaciju rute.";
    }

    if (foodLoaded) {
      const normalizedBudget = b === "comfortable" ? "comfortable" : b;
      const foodData = foodRecommendations?.[f]?.[normalizedBudget];
      if (foodData) {
        const card = document.createElement("div");
        card.className = "card route-card";
        let html = `<strong>${foodData.title}</strong><br><em>${foodData.summary}</em><br><br>`;
        foodData.recommendations.forEach(x => {
          html += `<strong>${x.time} — ${x.place}</strong><br>${x.description}<br><br>`;
        });
        card.innerHTML = `
          <div class="route-card-icon">🍽️</div>
          <div class="card-text">
            <h3>${formatOptionLabel(f)} • ${formatOptionLabel(normalizedBudget)}</h3>
            <p>${html}</p>
          </div>`;
        resultContainer.appendChild(card);
      }
    }

    pdfBtn.style.display = "inline-block";
  });

  // COLLAPSIBLE PANEL LOGIC
  const panel = document.getElementById("route-planner-panel");
  const header = document.getElementById("route-planner-toggle");
  if (panel && header) {
    header.addEventListener("click", () => {
      panel.classList.toggle("collapsed");
      panel.classList.toggle("open");
      const arrow = document.getElementById("route-arrow");
      if (arrow) {
        arrow.textContent = panel.classList.contains("open") ? "▲" : "▼";
      }
    });
  }

  // OPTIONAL: PDF EXPORT if html2pdf is available
  pdfBtn?.addEventListener("click", () => {
    const element = document.getElementById("route-result");
    const opt = {
      filename: "budapest-route.pdf",
      margin: 10,
      jsPDF: { unit: "mm", format: "a4" }
    };
    html2pdf().set(opt).from(element).save();
  });
});
