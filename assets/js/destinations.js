document.addEventListener("DOMContentLoaded", function () {
  const countryCards = document.querySelectorAll(".country-card");
  const countrySections = document.querySelectorAll(".country-section");

  countryCards.forEach(card => {
    card.addEventListener("click", () => {
      const country = card.dataset.country;

      // Sakrij sve
      countrySections.forEach(sec => sec.style.display = "none");

      // Prikaži odgovarajuću
      const target = document.getElementById(country);
      if (target) target.style.display = "block";

      // Scroll to it
      target.scrollIntoView({ behavior: "smooth" });
    });
  });
});
