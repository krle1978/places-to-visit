const CITY_DATA_URL = "/destinations/cities_geolocation.json";

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
    document.getElementById("gpsBtn"),
    ...document.querySelectorAll('.image-btn-link[aria-label="I\'m Here"]')
  ].filter(Boolean);

  triggers.forEach(btn => {
    btn.addEventListener("click", startTracking);
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
