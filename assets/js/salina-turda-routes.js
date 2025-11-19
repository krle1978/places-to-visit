// assets/js/salina-turda-routes.js

// =======================
// CONFIG
// =======================

const CSV_URL = "/assets/recommendations/salina_turda_route_recommendations.csv";

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

            routeRecommendations = rows
                .map(row => ({
                    category: row.category,
                    daytime: row.daytime,
                    recommendation: row.recommendation
                }))
                .filter(r => r.category && r.daytime && r.recommendation);

            routesLoaded = true;
            console.info("[Salina Turda routes] Loaded", routeRecommendations.length, "routes.");
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
    const categorySelect = document.getElementById("route-category");
    const daytimeSelect = document.getElementById("route-daytime");

    if (!categorySelect || !daytimeSelect) return;

    const unique = arr => [...new Set(arr)].sort();

    const categories = unique(routeRecommendations.map(r => r.category));
    categorySelect.innerHTML = `<option value="">-- Select visitor type --</option>`;
    categories.forEach(v => categorySelect.innerHTML += `<option value="${v}">${v}</option>`);

    const times = unique(routeRecommendations.map(r => r.daytime));
    daytimeSelect.innerHTML = `<option value="">-- Select time of day --</option>`;
    times.forEach(v => daytimeSelect.innerHTML += `<option value="${v}">${v}</option>`);
}

// =======================
// UI LOGIC
// =======================

document.addEventListener("DOMContentLoaded", function () {

    const categorySelect = document.getElementById("route-category");
    const daytimeSelect = document.getElementById("route-daytime");

    const submitBtn = document.getElementById("route-submit");
    const errorMessage = document.getElementById("route-error");
    const resultContainer = document.getElementById("route-result");
    const pdfBtn = document.getElementById("save-pdf-btn");

    const panel = document.getElementById("route-planner-panel");
    const header = document.getElementById("route-planner-toggle");
    const arrow = document.getElementById("route-arrow");
    const openBtn = document.getElementById("route-open-btn");

    // Load CSV + populate
    loadRouteRecommendations().then(() => {
        if (!routesLoadError && routeRecommendations.length > 0) {
            populateDropdowns();
        }
    });

    // Submit handler
    submitBtn.addEventListener("click", () => {
        errorMessage.textContent = "";
        resultContainer.innerHTML = "";
        pdfBtn.style.display = "none";

        if (routesLoadError)
            return errorMessage.textContent = "Error loading CSV.";

        if (!routesLoaded)
            return errorMessage.textContent = "Routes are still loading...";

        const category = categorySelect.value;
        const daytime = daytimeSelect.value;

        if (!category || !daytime) {
            errorMessage.textContent = "Please select both fields.";
            return;
        }

        const match = routeRecommendations.find(r =>
            r.category === category &&
            r.daytime === daytime
        );

        if (!match) {
            errorMessage.textContent = "No recommendation for this combination.";
            return;
        }

        const card = document.createElement("div");
        card.className = "card route-card";

        const formatted = match.recommendation
            .split("|")
            .map(line => `<li>${line}</li>`)
            .join("");

        card.innerHTML = `
            <div class="card-text">
                <h3>${category} • ${daytime}</h3>
                <ul>${formatted}</ul>
            </div>
        `;

        resultContainer.appendChild(card);
        pdfBtn.style.display = "inline-block";
    });

    // PDF EXPORT
    pdfBtn?.addEventListener("click", () => {
        const element = document.getElementById("route-result");

        const opt = {
            filename: "salina-turda-route.pdf",
            margin: 10,
            jsPDF: { unit: "mm", format: "a4" }
        };

        html2pdf().set(opt).from(element).save();
    });

    // COLLAPSIBLE PANEL + STRELICA ROTACIJA
    if (panel && header) {
        const toggle = () => {
            panel.classList.toggle("collapsed");
            panel.classList.toggle("open");

            if (arrow) {
                arrow.textContent = panel.classList.contains("open") ? "▲" : "▼";
            }
        };

        header.addEventListener("click", toggle);

        if (openBtn) {
            openBtn.addEventListener("click", e => {
                e.stopPropagation();
                panel.classList.remove("collapsed");
                panel.classList.add("open");
                if (arrow) arrow.textContent = "▲";
                header.scrollIntoView({ behavior: "smooth" });
            });
        }
    }
});
