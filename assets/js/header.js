window.addEventListener("load", () => {

    /* MOBILE MENU TOGGLE */
    const toggle = document.getElementById("mobile-toggle");
    const menu = document.getElementById("mobile-menu");

    if (toggle && menu) {
        toggle.addEventListener("click", (e) => {
            e.preventDefault();
            menu.classList.toggle("open");
            toggle.classList.toggle("open");
        });
    }

    /* SUBMENU BUTTONS */
    const buttons = document.querySelectorAll(".mobile-toggle-btn");

    buttons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();

            const submenu = btn.parentElement.querySelector(":scope > ul");

            if (submenu) {
                submenu.classList.toggle("open");
            }

            btn.classList.toggle("open");
        });
    });

});
