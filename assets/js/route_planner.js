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
    Czechia: "recommendations_places_czech.json",
    Germany: "recommendations_places_germany.json",
    Hungary: "recommendations_places_hungary.json",
    Romania: "recommendations_places_romania.json",
    Slovakia: "recommendations_places_slovakia.json",
    Serbia: "recommendations_places_serbia.json"
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

    let segments = text.split("|").map(s => s.trim()).filter(Boolean);
    let output = "";
    let listItems = "";

    segments.forEach(seg => {
      if (seg.includes("*")) {
        // Pronađi deo pre i posle "*"
        const [titlePart, ...rest] = seg.split("*");
        const title = titlePart.trim();
        const content = rest.join("*").trim();
        listItems += `<li><strong>${title}</strong> ${content}</li>`;
      } else {
        output += `<strong>${seg}</strong><br>`;
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

    // Trip type formatting
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

    // Season
    const seasonObj = selectedCityObj.seasons[season];
    routeText += `<strong>Season event:</strong> ${seasonObj.event}<br>`;

    if (seasonObj.ideas)
      routeText += `<strong>Ideas:</strong><br>${parseTextBlock(seasonObj.ideas.join("|"))}<br>`;

    if (seasonObj.locations)
      routeText += `<strong>Locations:</strong><br>${parseTextBlock(seasonObj.locations.join("|"))}<br>`;

    // Tips
    const tipObj = selectedCityObj.tips?.[tipKey];
    if (tipObj) {
      routeText += `<strong>Suggested places:</strong><br>${parseTextBlock(tipObj.places.join("|"))}<br>`;
      routeText += `<strong>What to get:</strong><br>${parseTextBlock(tipObj.what_to_get.join("|"))}<br>`;
    }

    routeText += `<strong>Interest:</strong> ${interest}<br>`;
    routeText += `<strong>Food preference:</strong> ${food}<br>`;

    resultDiv.innerHTML = routeText;
    resultWrapper.style.display = "block";

    savePdfBtn.onclick = function () {
      html2pdf()
        .set({
          margin: 0.5,
          filename: `${selectedCountry.name}-${selectedCityObj.name}-route.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
        })
        .from(resultDiv)
        .save();
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
  const toggleBtn = document.getElementById('toggle-planner-btn');
  const plannerHeader = document.getElementById('planner-header');
  const plannerContent = document.getElementById('planner-content');

  function togglePlanner() {
    if (!plannerContent) return;
    plannerContent.style.display = plannerContent.style.display === 'none' ? 'block' : 'none';
  }

  if (toggleBtn) toggleBtn.addEventListener('click', togglePlanner);
  if (plannerHeader) plannerHeader.addEventListener('click', togglePlanner);
