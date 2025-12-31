const CITY_DATA_URL = "/destinations/cities_geolocation.json";

const BUTTON_IDS = {
  gps: "gpsBtn",
  planner: "toggle-planner-btn"
};

function distance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

let cachedCities = null;
let pendingPlannerSelection = null;
function setButtonState(activeKey) {
  const gpsLink = document.getElementById(BUTTON_IDS.gps);
  const gpsImg = gpsLink?.querySelector(".stateful-btn-image");
  const plannerBtn = document.getElementById(BUTTON_IDS.planner);

  const gpsActive = activeKey === "gps";
  const plannerActive = activeKey === "planner";

  if (gpsImg) {
    gpsImg.dataset.locked = gpsActive ? "true" : "false";
    const nextSrc = gpsActive ? gpsImg.dataset.active : gpsImg.dataset.default;
    if (nextSrc) gpsImg.src = nextSrc;
  }
  if (gpsLink) {
    gpsLink.classList.toggle("is-disabled", gpsActive);
    gpsLink.setAttribute("aria-disabled", gpsActive ? "true" : "false");
  }
  if (plannerBtn) {
    plannerBtn.disabled = plannerActive;
    plannerBtn.classList.toggle("is-active", plannerActive);
  }
}

function openRoutePlannerSection() {
  const wrapper = document.querySelector(".route-planner-wrapper");

  if (window.routePlannerEasy?.openPanel) {
    window.routePlannerEasy.openPanel();
  } else {
    const panel = document.getElementById("route-planner-panel");
    const arrow = document.getElementById("route-arrow");

    if (panel) {
      panel.classList.add("open");
      panel.classList.remove("collapsed");
    }
    if (arrow) arrow.classList.add("open");
  }

  if (wrapper) {
    setTimeout(() => {
      wrapper.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }
}
async function loadCities() {
  if (cachedCities) return cachedCities;
  try {
    const response = await fetch(CITY_DATA_URL);
    if (!response.ok) throw new Error("Failed to load cities_geolocation.json");
    cachedCities = await response.json();
    return cachedCities;
  } catch (err) {
    console.error(err);
    alert("Could not load city data.");
    return [];
  }
}

async function getNearestCity(userLat, userLon) {
  const cities = await loadCities();
  return cities.reduce((closest, city) => {
    if (!city.lat || !city.lon) return closest;
    const d = distance(userLat, userLon, city.lat, city.lon);
    if (!closest || d < closest.distance) {
      return { ...city, distance: d };
    }
    return closest;
  }, null);
}

function updateLocationReadout(lat, lon, accuracy) {
  const latEl = document.getElementById("lat");
  const lonEl = document.getElementById("lon");
  const accEl = document.getElementById("acc");
  if (latEl) latEl.innerText = lat.toFixed(6);
  if (lonEl) lonEl.innerText = lon.toFixed(6);
  if (accEl && typeof accuracy === "number") accEl.innerText = accuracy.toFixed(1);
}

function showNearestCity(city) {
  const cityEl = document.getElementById("nearestCity");
  if (cityEl && city?.name) cityEl.innerText = city.name;
}

function sendToRoutePlanner(city) {
  if (!city) return;
  const planner = window.routePlannerEasy;
  const countryName = city.country || city.countryName;
  const cityName = city.routeCity || city.name;

  if (planner?.selectLocation && countryName && cityName) {
    planner.selectLocation(countryName, cityName);
    pendingPlannerSelection = null;
  } else {
    pendingPlannerSelection = countryName && cityName ? { countryName, cityName } : null;
    console.warn("Route planner API not ready or city lacks country mapping.", city);
  }
}

function startTracking(e) {
  if (e?.preventDefault) e.preventDefault();

  setButtonState("gps");
  openRoutePlannerSection();

  if (!navigator.geolocation) {
    alert("Your browser does not support geolocation.");
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    const { latitude, longitude, accuracy } = position.coords;
    updateLocationReadout(latitude, longitude, accuracy);

    const city = await getNearestCity(latitude, longitude);
    if (city) {
      showNearestCity(city);
      sendToRoutePlanner(city);
    } else {
      alert("Could not determine the nearest city.");
    }
  }, (err) => {
    alert("Location error: " + err.message);
  }, { enableHighAccuracy: true, timeout: 15000 });
}

function bindLocationButtons() {
  const triggers = [
    document.getElementById(BUTTON_IDS.gps),
    ...document.querySelectorAll('.image-btn-link[aria-label="I\'m Here"]')
  ].filter(Boolean);

  triggers.forEach(btn => {
    btn.addEventListener("click", startTracking);
  });

  const plannerBtn = document.getElementById(BUTTON_IDS.planner);
  if (plannerBtn) {
    plannerBtn.addEventListener("click", () => setButtonState("planner"));
  }

  // ensure default state on load
  setButtonState(null);

  // 🔥 Poziva se za checkboxove i dugme Show Me!
  setupCategorySelector();
}

function setupCategorySelector() {
  const gpsBtn = document.getElementById(BUTTON_IDS.gps);
  const categorySelector = document.getElementById("category-selector");
  const showMapBtn = document.getElementById("show-map-btn");

  if (!gpsBtn || !categorySelector || !showMapBtn) return;

  // Prikazivanje checkboxova nakon klika
  gpsBtn.addEventListener("click", function (e) {
    e.preventDefault(); // Spreči otvaranje linka
    categorySelector.style.display = categorySelector.style.display === "none" ? "block" : "none";
  });

  // Show Me! dugme logika
  showMapBtn.addEventListener("click", function () {
    const selectedCategories = Array.from(document.querySelectorAll(".category:checked"))
      .map(cb => cb.value);

    if (selectedCategories.length === 0) {
      alert("Please select at least one category.");
      return;
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(function (position) {
      const { latitude, longitude } = position.coords;
      const query = selectedCategories.join(" AND ");
      const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${latitude},${longitude},15z`;
      window.open(url, "_blank");
    }, function () {
      alert("Unable to retrieve your location.");
    });
  });
}

document.addEventListener("DOMContentLoaded", bindLocationButtons);
document.addEventListener("routePlanner:ready", () => {
  if (pendingPlannerSelection && window.routePlannerEasy?.selectLocation) {
    const { countryName, cityName } = pendingPlannerSelection;
    window.routePlannerEasy.selectLocation(countryName, cityName);
    pendingPlannerSelection = null;
  }
});
