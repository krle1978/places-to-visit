// ======================================================
// CONFIG
// ======================================================

const JSON_URL = "/assets/recommendations/cluj_napoca_route_recommendations.json";

const icons = {
    interest: {
        history: "🏰",
        art: "🎨",
        nature: "🌿",
        cafes: "☕",
        nightlife: "🍸",
        mixed: "✨"
    },
    food: {
        local_romanian: "🍲",
        fast_food: "🍔",
        fancy: "🍷",
        vegetarian: "🥗",
        anything_good: "🍽️"
    },
    budget: {
        low: "💸",
        medium: "💶",
        high: "💎"
    },
    tempo: {
        relaxed: "🧘",
        active: "🔥",
        balanced: "⚖️"
    },
    duration: {
        full_day: "🕒",
        half_day: "⏱️",
        evening: "🌙"
    }
};

let routeSchema = null;
let questions = [];
let advice = null;

let dataLoaded = false;
let dataError = null;


// ======================================================
// LOAD JSON
// ======================================================

function loadRouteSchema() {
    return fetch(JSON_URL)
        .then(res => {
            if (!res.ok) throw new Error("Failed to load JSON: " + res.status);
            return res.json();
        })
        .then(json => {
            routeSchema = json;
            questions = json.questions;
            advice = json.advice;

            dataLoaded = true;
            console.info("[Cluj routes] Loaded schema with", questions.length, "questions.");
        })
        .catch(err => {
            dataError = err;
            console.error(err);
        });
}


// ======================================================
// BUILD DYNAMIC FORM FROM SCHEMA
// ======================================================

function buildDynamicForm() {
    const wrapper = document.getElementById("route-controls");
    if (!wrapper || !questions) return;

    questions.forEach(q => {
        const field = document.createElement("div");
        field.className = "route-field";

        let html = `
            <label for="route-${q.id}">${q.label}</label>
            <select id="route-${q.id}">
                <option value="">-- Select --</option>
        `;

        q.options.forEach(opt => {
            html += `<option value="${opt.id}">${opt.label}</option>`;
        });

        html += `</select>`;
        field.innerHTML = html;

        wrapper.appendChild(field);
    });
}


// ======================================================
// CARD BUILDER (Corrected + Icons)
// ======================================================

function buildResultCard(category, optionId, title, tips) {
    const card = document.createElement("div");
    card.className = "card route-card";

    const icon = icons[category]?.[optionId] || "✨";

    const list = tips.map(t => `<li>${t}</li>`).join("");

    card.innerHTML = `
        <div class="route-card-icon">${icon}</div>
        <div class="card-text">
            <h3>${title}</h3>
            <ul>${list}</ul>
        </div>
    `;

    return card;
}


// ======================================================
// UI LOGIC
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    const submitBtn = document.getElementById("route-submit");
    const errorMessage = document.getElementById("route-error");
    const resultContainer = document.getElementById("route-result");
    const pdfBtn = document.getElementById("save-pdf-btn");

    const panel = document.getElementById("route-planner-panel");
    const header = document.getElementById("route-planner-toggle");
    const openBtn = document.getElementById("route-open-btn");

    const order = ["interest", "tempo", "duration", "food", "budget"];

    // Load JSON → Build form
    loadRouteSchema().then(() => {
        if (!dataError && dataLoaded) {
            buildDynamicForm();
        }
    });

    // SUBMIT HANDLER
    submitBtn.addEventListener("click", () => {
        errorMessage.textContent = "";
        resultContainer.innerHTML = "";
        pdfBtn.style.display = "none";

        if (dataError)
            return errorMessage.textContent = "Error loading JSON.";
        if (!dataLoaded)
            return errorMessage.textContent = "Still loading...";

        // Read values
        const selected = {};
        let missing = false;

        questions.forEach(q => {
            const val = document.getElementById("route-" + q.id).value;
            selected[q.id] = val;
            if (!val) missing = true;
        });

        if (missing) {
            errorMessage.textContent = "Please answer all questions.";
            return;
        }

        // Build result cards
        let cards = [];

        questions.forEach(q => {
            const category = q.id;        // interest / food / tempo etc.
            const optionId = selected[q.id];  // fast_food / active / full_day...
            const info = advice[category][optionId];

            const card = buildResultCard(
                category,
                optionId,
                info.title,
                info.tips
            );

            cards.push({ category, card });
        });

        // Sort
        cards.sort((a, b) => {
            return order.indexOf(a.category) - order.indexOf(b.category);
        });

        // Render
        cards.forEach(item => resultContainer.appendChild(item.card));

        // Show PDF button
        pdfBtn.style.display = "inline-block";
    });


    // PDF EXPORT
    pdfBtn?.addEventListener("click", () => {
        const element = document.getElementById("route-result");

        const opt = {
            filename: "cluj-napoca-route.pdf",
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
