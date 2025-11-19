// =======================
// CONFIG
// =======================
const JSON_URL = "/assets/recommendations/timisoara_route_recommendations.json";

const icons = {
    interest: {
        history: "🏰",
        art: "🎨",
        nature: "🌿",
        nightlife: "🍸"
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
        half_day: "⏱️",
        evening: "🌙"
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
    const tripDurations = Object.keys(data); // e.g. "full_day", "half_day", etc.
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
    return fetch(JSON_URL)
        .then(res => {
            if (!res.ok) throw new Error("Failed to load JSON: " + res.status);
            return res.json();
        })
        .then(json => {
            routeRecommendations = flattenRecommendations(json);
            routesLoaded = true;
            console.info("[Timisoara routes] Loaded", routeRecommendations.length, "routes.");
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
    recommendation.schedule.forEach(item => {
        bodyHTML += `<strong>${item.time} — ${item.title}</strong><br>${item.description}<br><br>`;
    });

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
    const arrow = document.getElementById("route-arrow");

    loadRouteRecommendations().then(() => {
        if (!routesLoadError && routeRecommendations.length > 0) {
            populateDropdowns();
        }
    });

    submitBtn.addEventListener("click", () => {
        errorMessage.textContent = "";
        resultContainer.innerHTML = "";
        pdfBtn.style.display = "none";

        if (routesLoadError)
            return errorMessage.textContent = "Greška pri učitavanju podataka.";
        if (!routesLoaded)
            return errorMessage.textContent = "Rute se još učitavaju...";

        const tripType = tripSelect.value;
        const interest = interestSelect.value;
        const food = foodSelect.value;
        const budget = budgetSelect.value;

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

        if (!match) {
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
            filename: "timisoara-route.pdf",
            margin: 10,
            jsPDF: { unit: "mm", format: "a4" }
        };
        html2pdf().set(opt).from(element).save();
    });

    // COLLAPSIBLE PANEL
    if (panel && header) {
        const toggle = () => {
            panel.classList.toggle("collapsed");
            panel.classList.toggle("open");
            if (arrow) {
                arrow.textContent = panel.classList.contains("open") ? "▲" : "▼";
            }
        };
        header.addEventListener("click", toggle);
    }
});
