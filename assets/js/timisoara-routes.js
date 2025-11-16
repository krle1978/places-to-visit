// assets/js/timisoara-routes.js

// =======================
// CONFIG
// =======================

const CSV_URL = "../../../../../../assets/recommendations/timisoara_route_recommendations.csv";

const interestLogos = {
    "History": "../../../../../../assets/images/logo/history_route.png",
    "Art": "../../../../../../assets/images/logo/art_route.png",
    "Nature": "../../../../../../assets/images/logo/nature_route.png",
    "Nightlife": "../../../../../../assets/images/logo/nightlife_route.png"
};

let routeRecommendations = [];
let routesLoaded = false;
let routesLoadError = null;

// =======================
// CSV PARSER
// =======================

function parseCsv(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = "";
    let inQuotes = false;

    text = text.replace(/\r\n/g, "\n");

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === '"') {
            const nextChar = text[i + 1];
            if (inQuotes && nextChar === '"') {
                currentCell += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell);
            currentCell = "";
        } else if (char === '\n' && !inQuotes) {
            currentRow.push(currentCell);
            rows.push(currentRow);
            currentRow = [];
            currentCell = "";
        } else {
            currentCell += char;
        }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }

    if (rows.length === 0) return [];

    const header = rows[0].map(h => h.trim());
    const dataRows = rows.slice(1);

    return dataRows
        .filter(r => r.some(cell => cell && cell.trim() !== ""))
        .map(r => {
            const obj = {};
            header.forEach((key, idx) => {
                obj[key] = (r[idx] || "").trim();
            });
            return obj;
        });
}

// =======================
// LOAD CSV
// =======================

function loadRouteRecommendations() {
    return fetch(CSV_URL)
        .then(res => {
            if (!res.ok) throw new Error("Failed to load CSV: " + res.status);
            return res.text();
        })
        .then(text => {
            const rows = parseCsv(text);

            routeRecommendations = rows.map(row => ({
                tripType: row.trip_type || row.tripType,
                interest: row.interests || row.interest,
                food: row.food,
                budget: row.budget,
                recommendation: row.recommendation
            })).filter(r =>
                r.tripType &&
                r.interest &&
                r.food &&
                r.budget &&
                r.recommendation
            );

            routesLoaded = true;
            console.info("[Timisoara routes] Loaded", routeRecommendations.length, "routes.");
        })
        .catch(err => {
            routesLoadError = err;
            console.error(err);
        });
}

// =======================
// POPULATE DROPDOWNS
// =======================

function populateDropdowns() {
    const tripSelect = document.getElementById("route-trip-type");
    const interestSelect = document.getElementById("route-interest");
    const foodSelect = document.getElementById("route-food");
    const budgetSelect = document.getElementById("route-budget");

    if (!tripSelect || !interestSelect || !foodSelect || !budgetSelect) return;

    const unique = arr => [...new Set(arr)].sort();

    // trip type
    const tripTypes = unique(routeRecommendations.map(r => r.tripType));
    tripSelect.innerHTML = `<option value="">-- Select trip type --</option>`;
    tripTypes.forEach(v => tripSelect.innerHTML += `<option value="${v}">${v}</option>`);

    // interests
    const interests = unique(routeRecommendations.map(r => r.interest));
    interestSelect.innerHTML = `<option value="">-- Select interest --</option>`;
    interests.forEach(v => interestSelect.innerHTML += `<option value="${v}">${v}</option>`);

    // food
    const foods = unique(routeRecommendations.map(r => r.food));
    foodSelect.innerHTML = `<option value="">-- Select food type --</option>`;
    foods.forEach(v => foodSelect.innerHTML += `<option value="${v}">${v}</option>`);

    // budget
    const budgets = unique(routeRecommendations.map(r => r.budget));
    budgetSelect.innerHTML = `<option value="">-- Select budget --</option>`;
    budgets.forEach(v => budgetSelect.innerHTML += `<option value="${v}">${v}</option>`);
}

// =======================
// UI LOGIC
// =======================

document.addEventListener("DOMContentLoaded", function () {
    const tripSelect = document.getElementById("route-trip-type");
    const interestSelect = document.getElementById("route-interest");
    const foodSelect = document.getElementById("route-food");
    const budgetSelect = document.getElementById("route-budget");
    const submitBtn = document.getElementById("route-submit");
    const errorMessage = document.getElementById("route-error");
    const resultContainer = document.getElementById("route-result");

    const panel = document.getElementById("route-planner-panel");
    const header = document.getElementById("route-planner-toggle");
    const openBtn = document.getElementById("route-open-btn");

    // Load CSV THEN populate dropdowns
    loadRouteRecommendations().then(() => {
        if (!routesLoadError && routeRecommendations.length > 0) {
            populateDropdowns();
        }
    });

    // submit handler
    submitBtn.addEventListener("click", () => {
        errorMessage.textContent = "";
        resultContainer.innerHTML = "";

        if (routesLoadError)
            return errorMessage.textContent = "Greška pri učitavanju CSV fajla.";

        if (!routesLoaded)
            return errorMessage.textContent = "Rute se učitavaju, pokušaj ponovo...";

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
            errorMessage.textContent = "Nema preporuke za tu kombinaciju.";
            return;
        }

        const card = document.createElement("a");
        card.className = "card route-card";
        card.href = "#";

        const logo = interestLogos[interest] || interestLogos["History"];

        card.innerHTML = `
            <img src="${logo}" alt="${interest} logo">
            <div class="card-text">
                <h3>${interest} • ${food} • ${budget} route</h3>
                <p>${match.recommendation.replace(/\n/g, "<br>")}</p>
            </div>
        `;

        resultContainer.appendChild(card);
    });

    // collapsible toggle
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
