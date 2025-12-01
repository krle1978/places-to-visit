// =======================
// CONFIG
// =======================

let JSON_URL = null;

const path = window.location.pathname.toLowerCase();

if (path.includes("salina-turda")) {
    JSON_URL = "/assets/recommendations/romania/salina-turda/salina_turda_route_recommendations.json";
} else if (path.includes("castelul-corvinilor")) {
    JSON_URL = "/assets/recommendations/romania/castelul-corvinilor/castelul_corvinilor_route_recommendations.json";
} else {
    console.error("Nepoznata stranica za učitavanje rute:", path);
}

let routeRecommendations = [];
let routesLoaded = false;
let routesLoadError = null;

// =======================
// LOAD JSON
// =======================

function loadRouteRecommendations() {
    if (!JSON_URL) {
        routesLoadError = new Error("JSON URL nije definisan za ovu stranicu.");
        return Promise.reject(routesLoadError);
    }

    return fetch(JSON_URL)
        .then(res => {
            if (!res.ok) throw new Error("Failed to load JSON: " + res.status);
            return res.json();
        })
        .then(data => {
            routeRecommendations = [];

            for (const category in data) {
                for (const daytime in data[category]) {
                    const steps = data[category][daytime];
                    if (Array.isArray(steps)) {
                        routeRecommendations.push({
                            category,
                            daytime,
                            recommendation: steps.join('|')
                        });
                    }
                }
            }

            routesLoaded = true;
            console.info("[Route Recommendations] Loaded", routeRecommendations.length, "entries.");
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
    categories.forEach(v => {
        const label = v.replace(/_/g, " ");
        categorySelect.innerHTML += `<option value="${v}">${label}</option>`;
    });

    const times = unique(routeRecommendations.map(r => r.daytime));
    daytimeSelect.innerHTML = `<option value="">-- Select time of day --</option>`;
    times.forEach(v => {
        const label = v.replace(/_/g, " ");
        daytimeSelect.innerHTML += `<option value="${v}">${label}</option>`;
    });
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
    const newBtn = document.getElementById("toggle-planner-btn"); // NOVO dugme

    // Load JSON + populate
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
            return errorMessage.textContent = "Error loading recommendations.";

        if (!routesLoaded)
            return errorMessage.textContent = "Recommendations are still loading...";

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
                <h3>${category.replace(/_/g, " ")} • ${daytime.replace(/_/g, " ")}</h3>
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
            filename: "route-recommendation.pdf",
            margin: 10,
            jsPDF: { unit: "mm", format: "a4" }
        };

        html2pdf().set(opt).from(element).save();
    });

    // =======================
    // SLIDER
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

    // =======================
    // COLLAPSIBLE PANEL + STRELICA
    // =======================
    if (panel && header) {
        const toggle = () => {
            panel.classList.toggle("collapsed");
            panel.classList.toggle("open");

            if (arrow) {
                arrow.textContent = panel.classList.contains("open") ? "▲" : "▼";
            }
        };

        header.addEventListener("click", toggle);

        const openPanel = () => {
            panel.classList.remove("collapsed");
            panel.classList.add("open");
            if (arrow) arrow.textContent = "▲";
            header.scrollIntoView({ behavior: "smooth" });
        };

        openBtn?.addEventListener("click", e => {
            e.stopPropagation();
            openPanel();
        });

        newBtn?.addEventListener("click", e => {
            e.stopPropagation();
            openPanel();
        });
    }
    // =======================
    // COLLAPSIBLE: WHY THIS PLACE IS SPECIAL
    // =======================

    const specialToggle = document.getElementById("special-toggle");
    const specialPanel = document.getElementById("special-panel");
    const specialArrow = document.getElementById("special-arrow");

    if (specialToggle && specialPanel) {
    specialToggle.addEventListener("click", () => {
        specialPanel.classList.toggle("collapsed");
        specialPanel.classList.toggle("open");

        if (specialArrow) {
        specialArrow.textContent = specialPanel.classList.contains("open") ? "▲" : "▼";
        }
    });
    }

});
