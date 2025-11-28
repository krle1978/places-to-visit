// =======================
// CONFIG
// =======================

const JSON_URLS = [
  "/assets/recommendations/hungary/szentendre/szentendre_route_FD_art_recommendations.json",
  "/assets/recommendations/hungary/szentendre/szentendre_route_FD_history_recommendations.json",
  "/assets/recommendations/hungary/szentendre/szentendre_route_FD_mixed_recommendations.json",
  "/assets/recommendations/hungary/szentendre/szentendre_route_FD_nature_recommendations.json",
  "/assets/recommendations/hungary/szentendre/szentendre_route_FD_nightlife_recommendations.json",
  "/assets/recommendations/hungary/szentendre/szentendre_route_HD_art_recommendations.json",
  "/assets/recommendations/hungary/szentendre/szentendre_route_HD_history_recommendations.json",
  "/assets/recommendations/hungary/szentendre/szentendre_route_HD_mixed_recommendations.json",
  "/assets/recommendations/hungary/szentendre/szentendre_route_HD_nature_recommendations.json",
  "/assets/recommendations/hungary/szentendre/szentendre_route_HD_nightlife_recommendations.json"
];

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
    high: "💎"
  },
  tripType: {
    full_day: "🕒",
    half_day: "⏱️"
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

  const tripDurations = Object.keys(data);
  tripDurations.forEach(duration => {
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
      console.info("[Szentendre routes] Loaded", routeRecommendations.length, "routes.");

      const countEl = document.getElementById("routes-loaded-count");
      if (countEl) {
        countEl.textContent = `🔄 Loaded ${routeRecommendations.length} route suggestions`;
      }
    })
    .catch(err => {
      routesLoadError = err;
      console.error(err);
    });
}

// =======================
// UI UTILITIES
// =======================

function buildResultCard(data) {
  const { tripType, interest, food, budget, recommendation } = data;

  const card = document.createElement("div");
  card.className = "card route-card";

  const headerIcons = [
    icons.tripType[tripType],
    icons.interest[interest],
    icons.food[food],
    icons.budget[budget]
  ].filter(Boolean).join(" ");

  let bodyHTML = `<strong>${recommendation.title}</strong><br><em>${recommendation.summary}</em><br><br>`;
  if (Array.isArray(recommendation.schedule)) {
    recommendation.schedule.forEach(item => {
      bodyHTML += `<strong>${item.time} — ${item.title}</strong><br>${item.description}<br><br>`;
    });
  }

  card.innerHTML = `
      <div class="route-card-icon">${headerIcons}</div>
      <div class="card-text">
          <h3>${formatOptionLabel(interest)} • ${formatOptionLabel(food)} • ${formatOptionLabel(budget)}</h3>
          <p>${bodyHTML}</p>
      </div>
  `;

  return card;
}

function populateDropdowns() {
  const tripSelect = document.getElementById("route-trip-type");
  const interestSelect = document.getElementById("route-interest");
  const foodSelect = document.getElementById("route-food");
  const budgetSelect = document.getElementById("route-budget");

  if (!tripSelect || !interestSelect || !foodSelect || !budgetSelect) return;

  const unique = arr => [...new Set(arr)].sort();

  const tripTypes = unique(routeRecommendations.map(r => r.tripType));
  tripSelect.innerHTML = `<option value="">-- Select trip type --</option>`;
  tripTypes.forEach(v => tripSelect.innerHTML += `<option value="${v}">${formatOptionLabel(v)}</option>`);

  const interests = unique(routeRecommendations.map(r => r.interest));
  interestSelect.innerHTML = `<option value="">-- Select interest --</option>`;
  interests.forEach(v => interestSelect.innerHTML += `<option value="${v}">${formatOptionLabel(v)}</option>`);

  const foods = unique(routeRecommendations.map(r => r.food));
  foodSelect.innerHTML = `<option value="">-- Select food type --</option>`;
  foods.forEach(v => foodSelect.innerHTML += `<option value="${v}">${formatOptionLabel(v)}</option>`);

  const budgets = unique(routeRecommendations.map(r => r.budget));
  budgetSelect.innerHTML = `<option value="">-- Select budget --</option>`;
  budgets.forEach(v => budgetSelect.innerHTML += `<option value="${v}">${formatOptionLabel(v)}</option>`);
}

// =======================
// INIT UI
// =======================

document.addEventListener("DOMContentLoaded", () => {
  const tripSelect = document.getElementById("route-trip-type");
  const interestSelect = document.getElementById("route-interest");
  const foodSelect = document.getElementById("route-food");
  const budgetSelect = document.getElementById("route-budget");

  const submitBtn = document.getElementById("route-submit");
  const errorMessage = document.getElementById("route-error");
  const resultContainer = document.getElementById("route-result");
  const pdfBtn = document.getElementById("save-pdf-btn");

  const panel = document.getElementById("route-planner-panel");
  const header = document.getElementById("route-planner-toggle");

  // Restore from localStorage
  tripSelect.value = localStorage.getItem("tripType") || "";
  interestSelect.value = localStorage.getItem("interest") || "";
  foodSelect.value = localStorage.getItem("food") || "";
  budgetSelect.value = localStorage.getItem("budget") || "";

  submitBtn.disabled = true;

  loadRouteRecommendations().then(() => {
    if (!routesLoadError && routeRecommendations.length > 0) {
      populateDropdowns();
      submitBtn.disabled = false;
    }
  });

  submitBtn.addEventListener("click", () => {
    errorMessage.textContent = "";
    resultContainer.innerHTML = "";
    pdfBtn.style.display = "none";

    const tripType = tripSelect.value;
    const interest = interestSelect.value;
    const food = foodSelect.value;
    const budget = budgetSelect.value;

    // Save to localStorage
    localStorage.setItem("tripType", tripType);
    localStorage.setItem("interest", interest);
    localStorage.setItem("food", food);
    localStorage.setItem("budget", budget);

    if (routesLoadError)
      return errorMessage.textContent = "Greška pri učitavanju podataka.";
    if (!routesLoaded)
      return errorMessage.textContent = "Rute se još učitavaju...";

    if (!tripType || !interest || !food || !budget) {
      errorMessage.textContent = "Molim te izaberi sve opcije.";
      return;
    }

    const match = routeRecommendations.find(r =>
      r.tripType === tripType &&
      r.interest === interest &&
      r.food === food &&
      r.budget === budget
    );

    if (!match || !match.recommendation || !Array.isArray(match.recommendation.schedule)) {
      errorMessage.textContent = "Nema preporuke za izabranu kombinaciju.";
      return;
    }

    const card = buildResultCard(match);
    resultContainer.appendChild(card);
    pdfBtn.style.display = "inline-block";
  });

  // PDF EXPORT
  pdfBtn?.addEventListener("click", () => {
    const element = document.getElementById("route-result");
    const opt = {
      filename: "szentendre-route.pdf",
      margin: 10,
      jsPDF: { unit: "mm", format: "a4" }
    };
    html2pdf().set(opt).from(element).save();
  });

  // COLLAPSIBLE PANEL
  if (panel && header) {
    header.addEventListener("click", () => {
      panel.classList.toggle("collapsed");
      panel.classList.toggle("open");
    });
  }
});
