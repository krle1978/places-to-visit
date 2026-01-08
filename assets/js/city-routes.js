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
      const level = data[duration][interest];
      const levelKeys = Object.keys(level);
      const firstValue = level[levelKeys[0]];
      const hasDirectBudget =
        firstValue &&
        typeof firstValue === "object" &&
        ("title" in firstValue || "summary" in firstValue || "schedule" in firstValue);

      if (hasDirectBudget) {
        levelKeys.forEach(budget => {
          result.push({
            tripType: duration,
            interest,
            food: null,
            budget,
            recommendation: level[budget]
          });
        });
      } else {
        levelKeys.forEach(food => {
          Object.keys(level[food]).forEach(budget => {
            result.push({
              tripType: duration,
              interest,
              food,
              budget,
              recommendation: level[food][budget]
            });
          });
        });
      }
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
  const { interest, food, budget, recommendation } = data;

  const card = document.createElement("div");
  card.className = "card route-card";

  const headerIcons = [
    icons.interest[interest],
    food ? icons.food[food] : null,
    icons.budget[budget]
  ].filter(Boolean).join(" ");

  let body = `<strong>${recommendation.title}</strong><br><em>${recommendation.summary}</em><br><br>`;
  recommendation.schedule.forEach(item => {
    const title = item.map_link
      ? `<a href="${item.map_link}" target="_blank" rel="noopener noreferrer">${item.title}</a>`
      : item.title;
    body += `<strong>${item.time} — ${title}</strong><br>${item.description}<br><br>`;
  });

  card.innerHTML = `
    <div class="route-card-icon">${headerIcons}</div>
    <div class="card-text">
      <h3>${formatOptionLabel(interest)}${food ? " • " + formatOptionLabel(food) : ""} • ${formatOptionLabel(budget)}</h3>
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
    const place = item.map_link
      ? `<a href="${item.map_link}" target="_blank" rel="noopener noreferrer">${item.place}</a>`
      : item.place;
    body += `<strong>${item.time} — ${place}</strong><br>${item.description}<br><br>`;
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

function getFoodKeys() {
  return foodRecommendations ? Object.keys(foodRecommendations) : [];
}

function getBudgetKeys(foodKey) {
  if (!foodRecommendations || !foodKey || !foodRecommendations[foodKey]) return [];
  return Object.keys(foodRecommendations[foodKey]);
}

function setSelectOptions(select, placeholder, values) {
  select.innerHTML = `<option value="">${placeholder}</option>` +
    values.map(v => `<option value="${v}">${formatOptionLabel(v)}</option>`).join("");
}

function setSelectEnabled(select, enabled) {
  select.disabled = !enabled;
  if (!enabled) {
    select.value = "";
  }
}

function populateTripOptions() {
  const trip = document.getElementById("route-trip-type");
  const uniq = arr => [...new Set(arr)].sort();
  setSelectOptions(
    trip,
    "-- Select trip type --",
    uniq(routeRecommendations.map(r => r.tripType))
  );
}

function updateInterestOptions(tripType) {
  const interest = document.getElementById("route-interest");
  const uniq = arr => [...new Set(arr)].sort();
  const values = routeRecommendations
    .filter(r => r.tripType === tripType)
    .map(r => r.interest);
  setSelectOptions(interest, "-- Select interest --", uniq(values));
}

function updateFoodOptions() {
  const food = document.getElementById("route-food");
  const uniq = arr => [...new Set(arr)].sort();
  setSelectOptions(food, "-- Select food type --", uniq(getFoodKeys()));
}

function updateBudgetOptions(foodKey) {
  const budget = document.getElementById("route-budget");
  const uniq = arr => [...new Set(arr)].sort();
  setSelectOptions(budget, "-- Select budget --", uniq(getBudgetKeys(foodKey)));
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

  // Disable dugme dok forma nije validna
  btn.disabled = true;
  btn.classList.add("disabled");

  // Funkcija za proveru validnosti forme
  function updateSubmitState() {
    const isValid = trip.value && interest.value && food.value && budget.value;
    btn.disabled = !isValid;
    btn.classList.toggle("disabled", !isValid);
    btn.title = isValid
      ? "Generate your route"
      : "Please select all fields to enable";
  }

  // Reaguj na promene
  setSelectEnabled(interest, false);
  setSelectEnabled(food, false);
  setSelectEnabled(budget, false);

  trip.addEventListener("change", () => {
    if (trip.value) {
      updateInterestOptions(trip.value);
      setSelectEnabled(interest, true);
    } else {
      setSelectEnabled(interest, false);
      setSelectEnabled(food, false);
      setSelectEnabled(budget, false);
    }
    setSelectOptions(food, "-- Select food type --", []);
    setSelectOptions(budget, "-- Select budget --", []);
    updateSubmitState();
  });

  interest.addEventListener("change", () => {
    if (interest.value) {
      updateFoodOptions();
      setSelectEnabled(food, true);
    } else {
      setSelectEnabled(food, false);
      setSelectEnabled(budget, false);
    }
    setSelectOptions(budget, "-- Select budget --", []);
    updateSubmitState();
  });

  food.addEventListener("change", () => {
    if (food.value) {
      updateBudgetOptions(food.value);
      setSelectEnabled(budget, true);
    } else {
      setSelectEnabled(budget, false);
    }
    updateSubmitState();
  });

  budget.addEventListener("change", updateSubmitState);

  Promise.all([loadRouteRecommendations(), loadFoodRecommendations()])
    .then(() => {
      if (!routesLoadError && routesLoaded) {
        populateTripOptions();
        setSelectOptions(interest, "-- Select interest --", []);
        setSelectOptions(food, "-- Select food type --", []);
        setSelectOptions(budget, "-- Select budget --", []);
        updateSubmitState(); // Revalidiraj nakon punjenja
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

    const match = routeRecommendations.find(r =>
      r.tripType === t &&
      r.interest === i &&
      r.budget === b &&
      (!r.food || r.food === f)
    );

    if (match) {
      result.appendChild(buildRouteCard(match));
    } else {
      error.textContent = "No perfect match, but here’s a food tip 👇";
    }

    const foodData = foodRecommendations?.[f]?.[b];
    if (foodData) {
      result.appendChild(buildFoodCard(foodData, f, b));
    }

    pdfBtn.style.display = "inline-block";
  });

  // COLLAPSIBLE PANEL: Route Planner
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

  // COLLAPSIBLE PANEL: Why Budapest is Special
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

  // PDF EXPORT
  pdfBtn?.addEventListener("click", () => {
    const element = document.getElementById("route-result");
    const opt = {
      filename: PDF_NAME,
      margin: 10,
      jsPDF: { unit: "mm", format: "a4" }
    };
    html2pdf().set(opt).from(element).save();
  });

  // SLIDER: What Did I Find
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

  updateSlider();
});





