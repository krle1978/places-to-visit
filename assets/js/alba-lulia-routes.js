// assets/js/alba-lulia-routes.js

// =======================
// CONFIG
// =======================

const JSON_URL = "/assets/recommendations/alba_lulia_route_recommendations.json";

let albaData = null;
let dataLoaded = false;
let dataLoadError = null;

// =======================
// LOAD JSON
// =======================

async function loadAlbaRecommendations() {
    try {
        const res = await fetch(JSON_URL);
        if (!res.ok) throw new Error("Failed to load JSON: " + res.status);

        albaData = await res.json();
        dataLoaded = true;
        console.info("[Alba Iulia routes] JSON loaded.");
    } catch (err) {
        dataLoadError = err;
        console.error(err);
    }
}

// =======================
// POPULATE DROPDOWNS
// =======================

function populateDropdowns() {
    if (!albaData) return;

    const interestSelect = document.getElementById("route-interest");
    const durationSelect = document.getElementById("route-duration");
    const styleSelect = document.getElementById("route-style");
    const foodSelect = document.getElementById("route-food");

    const setOptions = (select, keys, defaultLabel) => {
        select.innerHTML = `<option value="">-- ${defaultLabel} --</option>`;
        keys.forEach(key => {
            select.innerHTML += `<option value="${key}">${key}</option>`;
        });
    };

    setOptions(interestSelect, Object.keys(albaData["Interests"]), "Select interest");
    setOptions(durationSelect, Object.keys(albaData["Tour Duration"]), "Select duration");
    setOptions(styleSelect, Object.keys(albaData["Style"]), "Select style");
    setOptions(foodSelect, Object.keys(albaData["Food Preferences"]), "Select food preference");
}

// =======================
// BUILD ROUTE RESULT
// =======================

function buildRecommendationCard() {
    const interest = document.getElementById("route-interest").value;
    const duration = document.getElementById("route-duration").value;
    const style = document.getElementById("route-style").value;
    const food = document.getElementById("route-food").value;

    const errorBox = document.getElementById("route-error");
    const resultBox = document.getElementById("route-result");

    errorBox.textContent = "";
    resultBox.innerHTML = "";

    if (!interest || !duration || !style || !food) {
        errorBox.textContent = "Please select all fields.";
        return;
    }

    const interestData = albaData["Interests"][interest];
    const durationData = albaData["Tour Duration"][duration];
    const styleData = albaData["Style"][style];
    const foodData = albaData["Food Preferences"][food];

    // Build list items from all sources
    const combined = [
        ...interestData.alba_iulia_recommendations,
        ...durationData.alba_iulia_recommendations,
        ...styleData.alba_iulia_recommendations,
        ...foodData.alba_iulia_recommendations
    ];

    // Deduplicate
    const uniqueItems = [...new Set(combined)];

    const listHTML = uniqueItems.map(item => `<li>${item}</li>`).join("");

    const card = document.createElement("div");
    card.className = "card route-card";

    card.innerHTML = `
        <div class="card-text">
            <h3>Your Alba Iulia Route</h3>
            <p><strong>Interest:</strong> ${interest}</p>
            <p><strong>Duration:</strong> ${duration}</p>
            <p><strong>Style:</strong> ${style}</p>
            <p><strong>Food:</strong> ${food}</p>
            <ul>${listHTML}</ul>
        </div>
    `;

    resultBox.appendChild(card);
}

// =======================
// UI LOGIC
// =======================

document.addEventListener("DOMContentLoaded", async () => {
    const submitBtn = document.getElementById("route-submit");

    const panel = document.getElementById("route-planner-panel");
    const header = document.getElementById("route-planner-toggle");
    const openBtn = document.getElementById("route-open-btn");

    await loadAlbaRecommendations();

    if (dataLoaded && !dataLoadError) {
        populateDropdowns();
    }

    submitBtn.addEventListener("click", () => {
        if (dataLoadError) {
            document.getElementById("route-error").textContent = "Error loading route data.";
            return;
        }
        if (!dataLoaded) {
            document.getElementById("route-error").textContent = "Loading...";
            return;
        }
        buildRecommendationCard();
    });

    // Collapsible toggle
    if (panel && header) {
        const toggle = () => {
            panel.classList.toggle("collapsed");
            panel.classList.toggle("open");
        };

        header.addEventListener("click", toggle);

        if (openBtn) {
            openBtn.addEventListener("click", e => {
                e.stopPropagation();
                panel.classList.remove("collapsed");
                panel.classList.add("open");
                header.scrollIntoView({ behavior: "smooth" });
            });
        }
    }
});
