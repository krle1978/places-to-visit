// =======================
// CONFIG
// =======================

const JSON_URLS = [
  "/assets/recommendations/croatia/vukovar/vukovar_route_FD_art_recommendations.json",
  "/assets/recommendations/croatia/vukovar/vukovar_route_FD_history_recommendations.json",
  "/assets/recommendations/croatia/vukovar/vukovar_route_FD_mixed_recommendations.json",
  "/assets/recommendations/croatia/vukovar/vukovar_route_FD_nature_recommendations.json",
  "/assets/recommendations/croatia/vukovar/vukovar_route_FD_nightlife_recommendations.json",
  "/assets/recommendations/croatia/vukovar/vukovar_route_HD_art_recommendations.json",
  "/assets/recommendations/croatia/vukovar/vukovar_route_HD_history_recommendations.json",
  "/assets/recommendations/croatia/vukovar/vukovar_route_HD_mixed_recommendations.json",
  "/assets/recommendations/croatia/vukovar/vukovar_route_HD_nature_recommendations.json",
  "/assets/recommendations/croatia/vukovar/vukovar_route_HD_nightlife_recommendations.json"
];

const FOOD_JSON_URL = "/assets/recommendations/croatia/vukovar/vukovar_food_recommendations.json";

let foodRecommendations = null;
let foodLoaded = false;

const icons = {
  interest: { history: "🏰", art: "🎨", nature: "🌿", nightlife: "🍸", mixed: "🔀" },
  food: { local_specialties: "🍲", light_veggie: "🥗", try_everything: "🍽️" },
  budget: { low: "💸", medium: "💶", high: "💎" },
  tripType: { full_day: "🕒", half_day: "⏱️" }
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
    Object.keys(data[duration]).forEach(interest => {
      Object.keys(data[duration][interest]).forEach(food => {
        Object.keys(data[duration][interest][food]).forEach(budget => {
          result.push({
            tripType: duration,
            interest,
            food,
            budget,
            recommendation: data[duration][interest][food][budget]
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
      if (!res.ok) throw new Error("Food JSON not found");
      return res.json();
    })
    .then(data => {
      foodRecommendations = data;
      foodLoaded = true;
      console.info("[Food] Loaded");
    })
    .catch(err => {
      console.error("Food load error:", err);
    });
}

function loadRouteRecommendations() {
  return Promise.all(
    JSON_URLS.map(url =>
      fetch(url).then(res => {
        if (!res.ok) throw new Error(url);
        return res.json();
      })
    )
  )
    .then(jsonArray => {
      jsonArray.forEach(json => {
        routeRecommendations = routeRecommendations.concat(flattenRecommendations(json));
      });
      routesLoaded = true;
      console.info("[Routes] Loaded:", routeRecommendations.length);
    })
    .catch(err => {
      routesLoadError = err;
      console.error("Route load error:", err);
    });
}

// =======================
// UI
// =======================

function buildResultCard(data) {
  const { tripType, interest, food, budget, recommendation } = data;

  const card = document.createElement("div");
  card.className = "card route-card";

  const iconsRow = [
    icons.tripType[tripType],
    icons.interest[interest],
    icons.food[food],
    icons.budget[budget]
  ].join(" ");

  let html = `<strong>${recommendation.title}</strong><br><em>${recommendation.summary}</em><br><br>`;

  recommendation.schedule.forEach(i => {
    html += `<strong>${i.time} — ${i.title}</strong><br>${i.description}<br><br>`;
  });

  card.innerHTML = `
    <div class="route-card-icon">${iconsRow}</div>
    <div class="card-text">
      <h3>${formatOptionLabel(interest)} • ${formatOptionLabel(food)} • ${formatOptionLabel(budget)}</h3>
      <p>${html}</p>
    </div>
  `;

  return card;
}

function populateDropdowns() {
  const trip = document.getElementById("route-trip-type");
  const interest = document.getElementById("route-interest");
  const food = document.getElementById("route-food");
  const budget = document.getElementById("route-budget");

  const uniq = a => [...new Set(a)].sort();

  trip.innerHTML = `<option value="">-- Select trip type --</option>` +
    uniq(routeRecommendations.map(r => r.tripType)).map(v => `<option value="${v}">${formatOptionLabel(v)}</option>`).join("");

  interest.innerHTML = `<option value="">-- Select interest --</option>` +
    uniq(routeRecommendations.map(r => r.interest)).map(v => `<option value="${v}">${formatOptionLabel(v)}</option>`).join("");

  food.innerHTML = `<option value="">-- Select food type --</option>` +
    uniq(routeRecommendations.map(r => r.food)).map(v => `<option value="${v}">${formatOptionLabel(v)}</option>`).join("");

  budget.innerHTML = `<option value="">-- Select budget --</option>` +
    uniq(routeRecommendations.map(r => r.budget)).map(v => `<option value="${v}">${formatOptionLabel(v)}</option>`).join("");
}

// =======================
// INIT
// =======================

document.addEventListener("DOMContentLoaded", () => {
  const trip = document.getElementById("route-trip-type");
  const interest = document.getElementById("route-interest");
  const food = document.getElementById("route-food");
  const budget = document.getElementById("route-budget");

  const btn = document.getElementById("route-submit");
  const error = document.getElementById("route-error");
  const result = document.getElementById("route-result");
  const pdfBtn = document.getElementById("save-pdf-btn");

  btn.disabled = true;

  loadRouteRecommendations()
    .then(() => loadFoodRecommendations())
    .then(() => {
      if (!routesLoadError) {
        populateDropdowns();
        btn.disabled = false;
      }
    });

  btn.addEventListener("click", () => {
    error.textContent = "";
    result.innerHTML = "";
    pdfBtn.style.display = "none";

    const t = trip.value;
    const i = interest.value;
    const f = food.value;
    const b = budget.value;

    if (!t || !i || !f || !b) {
      error.textContent = "Molim izaberi sve opcije.";
      return;
    }

    const match = routeRecommendations.find(r =>
      r.tripType === t && r.interest === i && r.food === f && r.budget === b
    );

    if (match) {
      result.appendChild(buildResultCard(match));
    } else {
      error.textContent = "Nema tačne rute, ali pogledaj gastro preporuku 👇";
    }

    if (foodLoaded) {
      const normalizedBudget = (b === "comfortable") ? "comfortable" : b;
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
        result.appendChild(card);
      }
    }

    pdfBtn.style.display = "inline-block";
  });

  // =======================
  // COLLAPSIBLE PANEL LOGIC
  // =======================
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

  // =======================
  // PDF EXPORT
  // =======================
  pdfBtn?.addEventListener("click", () => {
    const element = document.getElementById("route-result");
    const opt = {
      filename: "vukovar-route.pdf",
      margin: 10,
      jsPDF: { unit: "mm", format: "a4" }
    };
    html2pdf().set(opt).from(element).save();
  });
});
