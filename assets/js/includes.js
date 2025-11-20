console.log("Includes JS loaded!");

document.addEventListener("DOMContentLoaded", async () => {

    /* ============================================================
       1. LOAD HTML INCLUDES (header, footer, cards…)
    ============================================================ */
    const includes = document.querySelectorAll("[data-include]");

    const loadInclude = async el => {
        let file = el.dataset.include;

        // Fix for local environment (removes leading slash)
        if (file.startsWith("/") && !location.hostname.includes("vercel.app")) {
            file = file.slice(1);
        }

        try {
            const response = await fetch(file);
            if (!response.ok) throw new Error(`Failed to load include file: ${file}`);

            el.innerHTML = await response.text();

            // Dynamic card template population
            if (file.includes("card.html")) {
                const card = el.querySelector(".card");
                if (!card) return;

                const { title, image, desc, link } = el.dataset;

                if (image) card.querySelector("img").src = image;
                if (title) card.querySelector("h3").innerText = title;
                if (desc) card.querySelector("p").innerText = desc;
                if (link) card.href = link;
            }

        } catch (err) {
            console.error("Include failed:", err);
        }
    };

    await Promise.all(Array.from(includes).map(loadInclude));

    /* ============================================================
       2. MOBILE MENU TOGGLE (logo dugme)
    ============================================================ */
    {
        const toggleBtn = document.getElementById("mobile-toggle");
        const mobileMenu = document.getElementById("mobile-menu");

        if (toggleBtn && mobileMenu) {
            toggleBtn.addEventListener("click", (e) => {
                e.preventDefault();
                mobileMenu.classList.toggle("open");
            });
        }
    }

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
       5. MOBILE DROPDOWN: Klik za otvaranje podmenija "Destinations" i "Romania"
    ============================================================ */
   document.addEventListener("click", function (e) {

    /* ================================
       Destinations (prvi nivo)
    ================================= */
    const isDestinationsBtn = e.target.closest(".dropdown-btn");

    if (isDestinationsBtn && window.innerWidth <= 600) {
            e.preventDefault();

            const li = isDestinationsBtn.closest(".dropdown");
            const menu = isDestinationsBtn.nextElementSibling;

            if (li) li.classList.toggle("open");
            if (menu) menu.classList.toggle("open");
        }

        /* ================================
        Romania (drugi nivo)
        ================================= */
        const isCountryItem = e.target.closest(".dropdown-country");

        if (isCountryItem && window.innerWidth <= 600) {
            e.preventDefault();

            const li = isCountryItem;
            const submenu = isCountryItem.querySelector(".dropdown-submenu");

            if (li) li.classList.toggle("open");
            if (submenu) submenu.classList.toggle("open");
        }
    });

});
