// assets/js/route_planner.js

document.addEventListener("includes:loaded", function () {

  const countrySelect = document.getElementById("route-country");
  const citySelect = document.getElementById("route-city");
  const tripTypeSelect = document.getElementById("route-trip-type");
  const interestSelect = document.getElementById("route-interest");
  const foodSelect = document.getElementById("route-food");
  const seasonSelect = document.getElementById("route-season");
  const tipCategorySelect = document.getElementById("route-tip-category");
  const submitBtn = document.getElementById("route-submit");
  const errorMsg = document.getElementById("route-error");
  const resultWrapper = document.querySelector(".route-result-wrapper");
  const resultDiv = document.getElementById("route-result");
  const savePdfBtn = document.getElementById("save-pdf-btn");

  let selectedCountry = null;
  let selectedCityObj = null;

  // Mapiranje države na JSON fajl
  const countryMap = {
    Austria: "recommendations_places_austria.json",
    Croatia: "recommendations_places_croatia.json",
    Czechia: "recommendations_places_czech.json",
    Germany: "recommendations_places_germany.json",
    Hungary: "recommendations_places_hungary.json",
    Portugal: "recommendations_places_portugal.json",
    Romania: "recommendations_places_romania.json",
    Serbia: "recommendations_places_serbia.json",
    Slovakia: "recommendations_places_slovakia.json",
    Spain: "recommendations_places_portugal.json"
  };

  function tripTypeLabel(type) {
    switch (type) {
      case "full_day": return "Full Day";
      case "morning": return "Morning";
      case "afternoon": return "Afternoon (includes Sunset)";
      case "night": return "Night (includes Sunset)";
      default: return type;
    }
  }

  /* -----------------------------------------------------------
     GENERIČNI PARSER ZA BLOKOVE ("* item", "|" novi red)
  ------------------------------------------------------------*/
    function parseTextBlock(text) {
      if (!text) return "";

      // 1. Zaštiti "TITLE: | description" da se ne razbije
      text = text.replace(/:\s*\|/g, ":::SEP:::");

      // 2. Podeli na segmente
      let segments = text.split("|").map(s => s.trim()).filter(Boolean);

      let output = "";
      let listItems = "";

      segments.forEach(seg => {

        // 3. Vrati zaštićeni separator
        seg = seg.replace(/:::SEP:::/g, ": ");

        // FORMAT 1: "Title: * description"
        if (seg.includes("*")) {
          const [titlePart, ...rest] = seg.split("*");
          const title = titlePart.trim();
          const content = rest.join("*").trim();
          listItems += `<li><strong>${title}</strong> ${content}</li>`;
        }

        // FORMAT 2: "Title: description"
        else if (seg.includes(":")) {
          const idx = seg.indexOf(":");
          const title = seg.slice(0, idx).trim();
          const content = seg.slice(idx + 1).trim();
          listItems += `<li><strong>${title}:</strong> ${content}</li>`;
        }

        // FORMAT 3: fallback
        else {
          listItems += `<li><strong>${seg}</strong></li>`;
        }
      });

      if (listItems) {
        output += `<ul>${listItems}</ul>`;
      }

      return output;
    }

  /* -----------------------------------------------------------
     POSEBNI PARSER ZA FULL DAY FORMAT
     (Morning: ... ; Afternoon: ... ; Sunset: ... ; Night: ...)
  ------------------------------------------------------------*/
  function parseFullDayText(text) {
    if (!text) return "";

    let parts = text.split(";").map(p => p.trim()).filter(Boolean);
    let output = "";

    parts.forEach(part => {
      let idx = part.indexOf(":");
      if (idx === -1) return;

      let sectionTitle = part.substring(0, idx).trim();
      let content = part.substring(idx + 1).trim();

      output += `<h4>${sectionTitle}:</h4>`;
      output += parseTextBlock(content);
      output += "<br>";
    });

    return output;
  }

  /* -----------------------------------------------------------
     POPUNI LISTU DRŽAVA
  ------------------------------------------------------------*/
  function populateCountries() {
    Object.keys(countryMap).forEach(country => {
      const opt = document.createElement("option");
      opt.value = country;
      opt.textContent = country;
      countrySelect.appendChild(opt);
    });
  }
  populateCountries();

  /* -----------------------------------------------------------
     KADA SE IZABERE DRŽAVA — UČITAJ FAJL
  ------------------------------------------------------------*/
    countrySelect.addEventListener("change", function () {
      const countryName = this.value;
      resetAll();
      if (!countryName) return;

      const fileName = countryMap[countryName];
      if (!fileName) {
        errorMsg.textContent = "No data available for selected country.";
        return;
      }

      fetch(`/assets/recommendations/${fileName}`)
        .then(res => res.json())
        .then(json => {
          selectedCountry = json;
          populateCities(json.cities);
        })
        .catch(err => {
          console.error("Error loading country JSON:", err);
          errorMsg.textContent = "Failed to load data for selected country.";
        });
    });

    function populateCities(cities) {
      cities.forEach(city => {
        const opt = document.createElement("option");
        opt.value = city.name;
        opt.textContent = city.name;
        citySelect.appendChild(opt);
      });
      enableSelect(citySelect);
    }

    /* -----------------------------------------------------------
      KADA SE IZABERE GRAD
    ------------------------------------------------------------*/
    citySelect.addEventListener("change", function () {
      resetCitySelections();

      const cityName = this.value;
      if (!cityName) return;

      selectedCityObj = selectedCountry.cities.find(c => c.name === cityName);

      enableSelect(tripTypeSelect);
      enableSelect(interestSelect);
      enableSelect(foodSelect);
      enableSelect(seasonSelect);
      enableSelect(tipCategorySelect);

      // Seasons
      Object.keys(selectedCityObj.seasons).forEach(season => {
        const opt = document.createElement("option");
        opt.value = season;
        opt.textContent = season.charAt(0).toUpperCase() + season.slice(1);
        seasonSelect.appendChild(opt);
      });

      // Trip types
      ["full_day", "morning", "afternoon", "night"].forEach(type => {
        const opt = document.createElement("option");
        opt.value = type;
        opt.textContent = tripTypeLabel(type);
        tripTypeSelect.appendChild(opt);
      });

      // Interests
      selectedCityObj.interests.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item;
        opt.textContent = item;
        interestSelect.appendChild(opt);
      });

      // Food preferences
      selectedCityObj.food_preferences.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item;
        opt.textContent = item;
        foodSelect.appendChild(opt);
      });

      // Tip categories
      const interestMap = selectedCityObj.interest_map || {};
      const uniqueKeys = new Set(Object.values(interestMap));
      uniqueKeys.forEach(key => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = key.replace(/_/g, " ");
        tipCategorySelect.appendChild(opt);
      });

      submitBtn.disabled = false;
    });

    /* -----------------------------------------------------------
      KADA SE KLIKNE "GET ROUTE RECOMMENDATION"
    ------------------------------------------------------------*/
  submitBtn.addEventListener("click", function () {
    errorMsg.textContent = "";

    if (!selectedCityObj) {
      errorMsg.textContent = "Please select a city.";
      return;
    }

    const tripType = tripTypeSelect.value;
    const interest = interestSelect.value;
    const food = foodSelect.value;
    const season = seasonSelect.value;
    const tipCategory = tipCategorySelect.value;

    const derivedTipKey = selectedCityObj.interest_map?.[interest];
    const tipKey = tipCategory || derivedTipKey;

    if (!tripType || !interest || !food || !season) {
      errorMsg.textContent = "Please fill in all fields.";
      return;
    }

    let routeText = "";
    const tour = selectedCityObj.tour_type;
    /* -------------------------
      TRIP TYPE
    -------------------------- */
    if (tripType === "full_day") {
      routeText += parseFullDayText(tour.full_day);
    } else if (tripType === "morning") {
      routeText += `<h4>Morning:</h4>${parseTextBlock(tour.morning)}<br>`;
    } else if (tripType === "afternoon") {
      routeText += `<h4>Afternoon:</h4>${parseTextBlock(tour.afternoon)}<br>`;
      routeText += `<h4>Sunset:</h4>${parseTextBlock(tour.sunset)}<br>`;
    } else if (tripType === "night") {
      routeText += `<h4>Sunset:</h4>${parseTextBlock(tour.sunset)}<br>`;
      routeText += `<h4>Night:</h4>${parseTextBlock(tour.night)}<br>`;
    }

    /* -------------------------
      SEASON
    -------------------------- */
    const seasonObj = selectedCityObj.seasons[season];
    routeText += `<strong>Season event:</strong> ${seasonObj.event}<br>`;

    if (seasonObj.ideas) {
      routeText += `<strong>Ideas:</strong><br>${parseTextBlock(seasonObj.ideas.join("|"))}<br>`;
    }

    if (seasonObj.locations) {
      routeText += `<strong>Locations:</strong><br>${parseTextBlock(seasonObj.locations.join("|"))}<br>`;
    }

    /* -------------------------
      TIPS
    -------------------------- */
    const tipObj = selectedCityObj.tips?.[tipKey];
    if (tipObj) {
      routeText += `<strong>Suggested places:</strong><br>${parseTextBlock(tipObj.places.join("|"))}<br>`;
      routeText += `<strong>What to get:</strong><br>${parseTextBlock(tipObj.what_to_get.join("|"))}<br>`;
    }

        /* -------------------------
          INTEREST: naziv + opis
        -------------------------- */
        const interestDescription = selectedCityObj.interest_descriptions?.[interest];
        if (interestDescription) {
          routeText += `
            <div class="route-interest-section">
              <p><strong>Interest:</strong> ${interest}</p>
              <p>${interestDescription}</p>
            </div>
            <br>
          `;
        } else {
          routeText += `<strong>Interest:</strong> ${interest}<br>`;
        }

    /* -------------------------
      FOOD
    -------------------------- */
    const foodDescription = selectedCityObj.food_descriptions?.[food];

    if (foodDescription) {
      routeText += `
        <div class="route-food-section">
          <p><strong>Food preference:</strong> ${food}</p>
          <p>${foodDescription}</p>
        </div>
        <br>
      `;
    } else {
      routeText += `<strong>Food preference:</strong> ${food}<br>`;
    }

    /* -------------------------
      OUTPUT
    -------------------------- */
    resultDiv.innerHTML = routeText;
    resultWrapper.style.display = "block";

    /* -------------------------
      PDF EXPORT
    -------------------------- */
    savePdfBtn.onclick = function () {
      const options = {
        filename: `${selectedCityObj.name}-route.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      savePdfBtn.style.display = "none";

      html2pdf()
        .from(resultWrapper)
        .set(options)
        .save()
        .then(() => {
          savePdfBtn.style.display = "inline-block";
        });
    };
  });

  /* -----------------------------------------------------------
     HELPER FUNKCIJE
  ------------------------------------------------------------*/
  function clearSelect(sel, placeholder) {
    sel.innerHTML = "";
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = placeholder;
    sel.appendChild(opt);
  }

  function disableSelect(sel) { sel.disabled = true; }
  function enableSelect(sel) { sel.disabled = false; }

  function resetAll() {
    clearSelect(citySelect, "Select a city");
    clearSelect(tripTypeSelect, "Select trip type");
    clearSelect(interestSelect, "Select interest");
    clearSelect(foodSelect, "Select food preference");
    clearSelect(seasonSelect, "Select season");
    clearSelect(tipCategorySelect, "Select tip category");

    disableSelect(citySelect);
    disableSelect(tripTypeSelect);
    disableSelect(interestSelect);
    disableSelect(foodSelect);
    disableSelect(seasonSelect);
    disableSelect(tipCategorySelect);

    selectedCityObj = null;
    resultWrapper.style.display = "none";
  }

  function resetCitySelections() {
    clearSelect(tripTypeSelect, "Select trip type");
    clearSelect(interestSelect, "Select interest");
    clearSelect(foodSelect, "Select food preference");
    clearSelect(seasonSelect, "Select season");
    clearSelect(tipCategorySelect, "Select tip category");

    disableSelect(tripTypeSelect);
    disableSelect(interestSelect);
    disableSelect(foodSelect);
    disableSelect(seasonSelect);
    disableSelect(tipCategorySelect);

    resultWrapper.style.display = "none";
  }

});
  // ----------------------------------------------
  // RASKLOPIVO PLANER VELO - ROUTE PLANNER TOGGLE
  // ----------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("route-planner-toggle");
  const panel = document.getElementById("route-planner-panel");
  const arrow = document.getElementById("route-arrow");
  const openBtn = document.getElementById("toggle-planner-btn");

  if (panel && header) {
    const toggle = () => {
      panel.classList.toggle("collapsed");
      panel.classList.toggle("open");
      arrow.classList.toggle("open");
    };

    header.addEventListener("click", toggle);

    if (openBtn) {
      openBtn.addEventListener("click", e => {
        e.stopPropagation();
        panel.classList.remove("collapsed");
        panel.classList.add("open");
        arrow.classList.add("open");
        header.scrollIntoView({ behavior: "smooth" });
      });
    }

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
