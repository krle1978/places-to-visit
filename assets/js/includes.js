// Load HTML components (header, footer, card wrappers, etc.)
function loadIncludes() {
    return new Promise(resolve => {
        const includeElements = document.querySelectorAll("[data-include]");
        let loaded = 0;

        if (includeElements.length === 0) {
            resolve();
            return;
        }

        includeElements.forEach(el => {
            const file = el.getAttribute("data-include");

            fetch(file)
                .then(resp => resp.text())
                .then(html => {
                    el.innerHTML = html;
                    loaded++;

                    if (loaded === includeElements.length) {
                        resolve();
                    }
                })
                .catch(err => console.error("Include failed:", file, err));
        });
    });
}

// Populate card components AFTER includes are done
function populateCards() {
    document.querySelectorAll("[data-title]").forEach(container => {
        const card = container.querySelector(".card");

        if (!card) return;

        const title = container.dataset.title || "";
        const image = container.dataset.image || "";
        const desc  = container.dataset.desc  || "";
        const link  = container.dataset.link  || "#";

        card.querySelector("h3").textContent = title;
        card.querySelector("p").textContent = desc;
        card.querySelector("img").src = image;
        card.href = link;
    });
}

// MAIN SEQUENCE
document.addEventListener("DOMContentLoaded", () => {
    loadIncludes().then(() => {
        populateCards();
    });
});
