// =======================
// GLOBAL CONFIG LOADER
// =======================

if (!window.ROUTE_CONFIG) {
  console.error("ROUTE_CONFIG nije definisan. Dodaj ga u HTML pre city-routes.js");
  throw new Error("Missing ROUTE_CONFIG");
}

const JSON_URLS = window.ROUTE_CONFIG.JSON_URLS || [];
const FOOD_JSON_URL = window.ROUTE_CONFIG.FOOD_JSON_URL;
const PDF_NAME = window.ROUTE_CONFIG.PDF_NAME || "route.pdf";

// =======================
// ICONS
// =======================

const icons = {
  interest: { history: "🏰", art: "🎨", nature: "🌿", nightlife: "🍸", mixed: "🔀" },
  food: { local_specialties: "🍲", light_veggie: "🥗", try_everything: "🍽️" },
  budget: { low: "💸", medium: "💶", high: "💎" },
  tripType: { full_day: "🕒", half_day: "⏱️" }
};

// =======================
// DATA
// =======================

let routeRecommendations = [];
let foodRecommendations = null;

let routesLoaded = false;
let foodLoaded = false;
let routesLoadError = null;

// =======================
// UTIL
// =======================

function formatOptionLabel(str) {
  return str.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// =======================
// FLATTEN ROUTES
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

// =======================
// LOAD ROUTES
// =======================

function loadRouteRecommendations() {
  return Promise.all(
    JSON_URLS.map(url =>
      fetch(url).then(res => {
        if (!res.ok) throw new Error("Failed: " + url);
        return res.json();
      })
    )
  )
  .then(jsons => {
    jsons.forEach(json => {
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
// LOAD FOOD
// =======================

function loadFoodRecommendations() {
  return fetch(FOOD_JSON_URL)
    .then(res => {
      if (!res.ok) throw new Error("Food JSON not found");
      return res.json();
    })
    .then(json => {
      foodRecommendations = json;
      foodLoaded = true;
      console.info("[Food] Loaded");
    })
    .catch(err => {
      console.error("Food load error:", err);
    });
}

// =======================
// UI BUILDERS
// =======================

function buildRouteCard(data) {
  const { tripType, interest, food, budget, recommendation } = data;

  const card = document.createElement("div");
  card.className = "card route-card";

  const headerIcons = [
    icons.tripType[tripType],
    icons.interest[interest],
    icons.food[food],
    icons.budget[budget]
  ].join(" ");

  let body = `<strong>${recommendation.title}</strong><br><em>${recommendation.summary}</em><br><br>`;
  recommendation.schedule.forEach(item => {
    body += `<strong>${item.time} — ${item.title}</strong><br>${item.description}<br><br>`;
  });

  card.innerHTML = `
    <div class="route-card-icon">${headerIcons}</div>
    <div class="card-text">
      <h3>${formatOptionLabel(interest)} • ${formatOptionLabel(food)} • ${formatOptionLabel(budget)}</h3>
      <p>${body}</p>
    </div>
  `;

  return card;
}

function buildFoodCard(foodData, foodKey, budgetKey) {
  const card = document.createElement("div");
  card.className = "card route-card";

  let body = `<strong>${foodData.title}</strong><br><em>${foodData.summary}</em><br><br>`;
  foodData.recommendations.forEach(item => {
    body += `<strong>${item.time} — ${item.place}</strong><br>${item.description}<br><br>`;
  });

  card.innerHTML = `
    <div class="route-card-icon">🍽️</div>
    <div class="card-text">
      <h3>${formatOptionLabel(foodKey)} • ${formatOptionLabel(budgetKey)}</h3>
      <p>${body}</p>
    </div>
  `;

  return card;
}

// =======================
// DROPDOWNS
// =======================

function populateDropdowns() {
  const trip = document.getElementById("route-trip-type");
  const interest = document.getElementById("route-interest");
  const food = document.getElementById("route-food");
  const budget = document.getElementById("route-budget");

  const uniq = arr => [...new Set(arr)].sort();

  trip.innerHTML = `<option value="">-- Select trip type --</option>` +
    uniq(routeRecommendations.map(r => r.tripType)).map(v =>
      `<option value="${v}">${formatOptionLabel(v)}</option>`).join("");

  interest.innerHTML = `<option value="">-- Select interest --</option>` +
    uniq(routeRecommendations.map(r => r.interest)).map(v =>
      `<option value="${v}">${formatOptionLabel(v)}</option>`).join("");

  food.innerHTML = `<option value="">-- Select food type --</option>` +
    uniq(routeRecommendations.map(r => r.food)).map(v =>
      `<option value="${v}">${formatOptionLabel(v)}</option>`).join("");

  budget.innerHTML = `<option value="">-- Select budget --</option>` +
    uniq(routeRecommendations.map(r => r.budget)).map(v =>
      `<option value="${v}">${formatOptionLabel(v)}</option>`).join("");
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

  const panel = document.getElementById("route-planner-panel");
  const header = document.getElementById("route-planner-toggle");
  const openBtn = document.getElementById("toggle-planner-btn");

  btn.disabled = true;

  Promise.all([loadRouteRecommendations(), loadFoodRecommendations()])
    .then(() => {
      if (!routesLoadError && routesLoaded) {
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

    const normalizedBudget = (b === "comfortable") ? "medium" : b;

    const match = routeRecommendations.find(r =>
      r.tripType === t &&
      r.interest === i &&
      r.food === f &&
      r.budget === b
    );

    if (match) {
      result.appendChild(buildRouteCard(match));
    } else {
      error.textContent = "Nema tačne rute, ali pogledaj gastro preporuku 👇";
    }

    const foodData = foodRecommendations?.[f]?.[normalizedBudget];
    if (foodData) {
      result.appendChild(buildFoodCard(foodData, f, normalizedBudget));
    }

    pdfBtn.style.display = "inline-block";
  });

  // =======================
  // COLLAPSIBLE PANEL: Route Planner
  // =======================
  if (panel && header) {
    const toggle = () => {
      panel.classList.toggle("collapsed");
      panel.classList.toggle("open");
    };

    header.addEventListener("click", toggle);

    openBtn?.addEventListener("click", e => {
      e.stopPropagation();
      panel.classList.remove("collapsed");
      panel.classList.add("open");
      setTimeout(() => {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    });
  }

  // =======================
  // COLLAPSIBLE PANEL: Why Budapest is Special
  // =======================
  const specialPanel = document.getElementById("special-panel");
  const specialToggle = document.getElementById("special-toggle");
  const specialArrow = document.getElementById("special-arrow");

  if (specialPanel && specialToggle) {
    specialToggle.addEventListener("click", () => {
      specialPanel.classList.toggle("collapsed");
      specialPanel.classList.toggle("open");
      if (specialArrow) {
        specialArrow.classList.toggle("rotated");
      }
    });
  }

  // =======================
  // PDF EXPORT
  // =======================
  pdfBtn?.addEventListener("click", () => {
    const element = document.getElementById("route-result");
    const opt = {
      filename: PDF_NAME,
      margin: 10,
      jsPDF: { unit: "mm", format: "a4" }
    };
    html2pdf().set(opt).from(element).save();
  });

  // =======================
  // SLIDER: What Did I Find
  // =======================
  const sliderContainer = document.querySelector(".slider-container");
  const slides = document.querySelectorAll(".gallery-text-block");
  const prevBtn = document.querySelector(".slider-btn.prev");
  const nextBtn = document.querySelector(".slider-btn.next");

  let currentSlide = 0;
  const totalSlides = slides.length;

  function updateSlider() {
    sliderContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
  }

  prevBtn?.addEventListener("click", () => {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateSlider();
  });

  nextBtn?.addEventListener("click", () => {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateSlider();
  });

  updateSlider(); // inicijalno
});
