console.log("Includes JS loaded!");

document.addEventListener("DOMContentLoaded", () => {
    const includes = document.querySelectorAll("[data-include]");

    includes.forEach(async (el) => {
        let file = el.getAttribute("data-include");

        // ukloni leading slash lokalno
        if (file.startsWith("/") && !window.location.hostname.includes("vercel.app")) {
            file = file.slice(1);
        }

        // fetch HTML komponente
        const response = await fetch(file);
        if (!response.ok) {
            console.error("Include failed:", file);
            return;
        }

        const html = await response.text();
        el.innerHTML = html;

        // --- DYNAMIC CARD DATA ---
        if (file.includes("card.html")) {
            const card = el.querySelector(".card");
            if (!card) return;

            const title = el.dataset.title;
            const image = el.dataset.image;
            const desc = el.dataset.desc;
            const link = el.dataset.link;

            const imgEl = card.querySelector("img");
            const h3El = card.querySelector("h3");
            const pEl = card.querySelector("p");

            if (imgEl && image) imgEl.src = image;
            if (h3El && title) h3El.innerText = title;
            if (pEl && desc) pEl.innerText = desc;
            if (link) card.href = link;
        }
    });
});
document.addEventListener("DOMContentLoaded", () => {
    const scrollBtn = document.getElementById("scrollToTopBtn");
    if (!scrollBtn) return;

    // Show/hide on scroll
    window.addEventListener("scroll", () => {
        if (window.scrollY > 400) {
            scrollBtn.classList.add("show");
        } else {
            scrollBtn.classList.remove("show");
        }
    });

    // Scroll to top
    scrollBtn.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const galleryToggle = document.getElementById("gallery-toggle");
    const galleryPanel = document.getElementById("gallery-panel");
    const galleryArrow = document.getElementById("gallery-arrow");

    // Ako ova stranica nema galeriju — prekidamo
    if (!galleryToggle || !galleryPanel || !galleryArrow) return;

    galleryToggle.addEventListener("click", () => {
        const isCollapsed = galleryPanel.classList.contains("collapsed");

        galleryPanel.classList.toggle("collapsed", !isCollapsed);
        galleryPanel.classList.toggle("open", isCollapsed);

        // Menjanje strelice
        galleryArrow.textContent = isCollapsed ? "▲" : "▼";
    });
});
