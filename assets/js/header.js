document.addEventListener("includes:loaded", () => {
    // ============================
    // MOBILE MENU TOGGLE
    // ============================
    const toggle = document.getElementById("mobile-toggle");
    const menu = document.getElementById("mobile-menu");

    if (toggle && menu) {
        toggle.addEventListener("click", (e) => {
            e.preventDefault();
            menu.classList.toggle("open");
            toggle.classList.toggle("open");

            // Close mobile menu when clicking a link
            const links = menu.querySelectorAll("a");
            links.forEach(link => {
                link.addEventListener("click", () => {
                    menu.classList.remove("open");
                    toggle.classList.remove("open");
                });
            });
        });
    }

    // ============================
    // DESKTOP HEADER SHOW/HIDE ON SCROLL (INSTANT SHOW ON UP SCROLL)
    // ============================
    let lastScrollY = window.scrollY;
    const desktopNav = document.querySelector(".desktop-nav");

    window.addEventListener("scroll", () => {
        if (window.innerWidth <= 600 || !desktopNav) return;

        if (window.scrollY > lastScrollY) {
            // Scrolling down — hide header
            desktopNav.classList.remove("show");
            desktopNav.classList.add("hide");
        } else if (window.scrollY < lastScrollY) {
            // Scrolling up — show header IMMEDIATELY
            desktopNav.classList.remove("hide");
            desktopNav.classList.add("show");
        }

        lastScrollY = window.scrollY;
    });

    // ============================
    // DYNAMIC LOGO BASED ON PAGE
    // ============================
    const logoLink = document.querySelector(".logo img");

    const specialPaths = [
        "/destinations/index.html",
        "/destinations/country/Romania/Timisoara/2025/October/index.html",
        "/destinations/country/Romania/Salina-Turda/2025/October/index.html",
        "/destinations/country/Romania/Cluj-Napoca/2025/October/index.html",
        "/destinations/country/Romania/Castelul-Corvinilor/2025/October/index.html",
        "/destinations/country/Romania/Alba-Iulia/2025/October/index.html",
        "/destinations/country/Hungary/Budapest/2025/November/index.html",
        "/destinations/country/Hungary/Szentandre/2025/November/index.html",
        "/destinations/country/Croatia/Vukovar/2025/November/index.html"
    ];

    if (logoLink && specialPaths.some(path => window.location.pathname.endsWith(path))) {
        logoLink.src = "/assets/images/logo/places_visited_by_rk.webp";
        logoLink.alt = "Visited by Rade Krstić";
    }
});
