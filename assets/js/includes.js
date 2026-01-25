// Helper: pretvara apsolutnu putanju u VALIDNU putanju za fetch
function resolveIncludePath(path) {
    // Ako počinje sa "/" – tretiramo kao apsolutno od ROOT-a
    if (path.startsWith("/")) {
        return path; // koristi direktno npr. /components/header.html
    }

    // Inače — relativna putanja se koristi kako jeste
    return path;
}

window.addEventListener("DOMContentLoaded", async () => {

    /* ============================================================
       1. LOAD HTML INCLUDES (header, footer, cards…)
    ============================================================ */
    const includes = document.querySelectorAll("[data-include]");

    const loadInclude = async (el) => {
        let file = resolveIncludePath(el.dataset.include);

        try {
            const response = await fetch(file);

            if (!response.ok) {
                throw new Error(`Failed to load include file: ${file}`);
            }

            const html = await response.text();
            el.innerHTML = html;

            /* ------------------------------
               Popunjavanje kartica (card.html)
            ------------------------------ */
            if (file.includes("card.html")) {
                const card = el.querySelector(".card");
                if (card) {
                    const { title, image, desc, link } = el.dataset;

                    if (image) card.querySelector("img").src = image;
                    if (title) card.querySelector("h3").innerText = title;
                    if (desc) card.querySelector("p").innerText = desc;
                    if (link) card.querySelector("a").href = link;
                }
            }

        } catch (err) {
            console.error("Include failed:", err);
        }
    };

    await Promise.all(Array.from(includes).map(loadInclude));

    // Signal za druge skripte da su svi includes gotovi
    document.dispatchEvent(new CustomEvent("includes:loaded"));
    
    /* ============================================================
       3. SCROLL TO TOP BUTTON
    ============================================================ */
    {
        const scrollBtn = document.getElementById("scrollToTopBtn");

        if (scrollBtn) {
            window.addEventListener("scroll", () => {
                scrollBtn.classList.toggle("show", window.scrollY > 400);
            });
            scrollBtn.addEventListener("click", () => {
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        }
    }

    /* ============================================================
       4. COLLAPSIBLE GALLERY SECTION
    ============================================================ */
    {
        const galleryToggle = document.getElementById("gallery-toggle");
        const galleryPanel = document.getElementById("gallery-panel");
        const galleryArrow = document.getElementById("gallery-arrow");

        if (galleryToggle && galleryPanel && galleryArrow) {
            galleryToggle.addEventListener("click", () => {
                const isOpen = galleryPanel.classList.contains("open");

                galleryPanel.classList.toggle("open", !isOpen);
                galleryPanel.classList.toggle("collapsed", isOpen);
                galleryArrow.textContent = isOpen ? "▼" : "▲";
            });
        }
    }

    /* ============================================================
       5. STATEFUL BUTTON IMAGES (hover/active/locked)
    ============================================================ */
    {
        const statefulImages = document.querySelectorAll("img.stateful-btn-image");

        statefulImages.forEach((img) => {
            const defaultSrc = img.dataset.default;
            const hoverSrc = img.dataset.hover;
            const activeSrc = img.dataset.active;
            const isLocked = () => img.dataset.locked === "true";
            const setSrc = (src) => { if (src) img.src = src; };

            img.addEventListener("mouseenter", () => { if (!isLocked()) setSrc(hoverSrc); });
            img.addEventListener("mouseleave", () => { if (!isLocked()) setSrc(defaultSrc); });
            img.addEventListener("mousedown", () => { if (!isLocked()) setSrc(activeSrc); });
            img.addEventListener("mouseup", () => { if (!isLocked()) setSrc(hoverSrc); });
            img.addEventListener("touchstart", () => { if (!isLocked()) setSrc(activeSrc); });
            img.addEventListener("touchend", () => { if (!isLocked()) setSrc(defaultSrc); });
            img.addEventListener("touchcancel", () => { if (!isLocked()) setSrc(defaultSrc); });
        });
    }

});

