document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("route-planner-toggle");
  const panel = document.getElementById("route-planner-panel");
  const arrow = document.getElementById("route-arrow");
  const openBtn = document.getElementById("toggle-planner-btn"); // dugme iz hero sekcije

  if (panel && header) {
    const toggle = () => {
      panel.classList.toggle("collapsed");
      panel.classList.toggle("open");
      arrow.classList.toggle("open"); // za rotaciju strelice
    };

    header.addEventListener("click", toggle);

    if (openBtn) {
      openBtn.addEventListener("click", e => {
        e.stopPropagation();
        panel.classList.remove("collapsed");
        panel.classList.add("open");
        arrow.classList.add("open"); // otvori strelicu
        header.scrollIntoView({ behavior: "smooth" });
      });
    }
    // Zatvori panel kad klikneš izvan njega
    document.addEventListener("click", (e) => {
    if (
        !panel.contains(e.target) &&
        !header.contains(e.target) &&
        !openBtn.contains(e.target)
    ) {
        panel.classList.add("collapsed");
        panel.classList.remove("open");
        arrow.classList.remove("open");
    }
    });

  }
});
