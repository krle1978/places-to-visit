// assets/js/route_planner_easy.js

document.addEventListener("includes:loaded", function () {
  const countrySelect = document.getElementById("route-country");
  const citySelect = document.getElementById("route-city");
  const submitBtn = document.getElementById("route-submit");
  const errorMsg = document.getElementById("route-error");
  const resultWrapper = document.querySelector(".route-result-wrapper");
  const resultDiv = document.getElementById("route-result");
  const savePdfBtn = document.getElementById("save-pdf-btn");

  let selectedCountry = null;
  let selectedCityObj = null;

  const countryMap = {
    Albania: "recommendations_Albania_easy.json",
    Andorra: "recommendations_Andorra_easy.json",
    Armenia: "recommendations_Armenia_easy.json",
    Austria: "recommendations_austria_easy.json",
    Azerbaijan: "recommendations_Azerbaijan_easy.json",
    Belarus: "recommendations_Belarus_easy.json",
    Belgium: "recommendations_Belgium_easy.json",
    "Bosnia and Herzegowina": "recommendations_Bosnia_and_Herzegowina_easy.json",
    Bulgaria: "recommendations_bulgaria_easy.json",
    Croatia: "recommendations_croatia_easy.json",
    Cyprus: "recommendations_Cyprus_easy.json",
    Czechia: "recommendations_czech_easy.json",
    Denmark: "recommendations_Denmark_easy.json",
    Estonia: "recommendations_Estonia_easy.json",
    Finland: "recommendations_Finland_easy.json",
    France: "recommendations_France_easy.json",
    Germany: "recommendations_germany_easy.json",
    Greece: "recommendations_greece_easy.json",
    Hungary: "recommendations_hungary_easy.json",
    Iceland: "recommendations_Iceland_easy.json",
    Ireland: "recommendations_Ireland_easy.json",
    Italy: "recommendations_Italy_easy.json",
    Latvia: "recommendations_Latvia_easy.json",
    Lithuania: "recommendations_Lithuania_easy.json",
    Luxembourg: "recommendations_Luxembourg_easy.json",
    Malta: "recommendations_Malta_easy.json",
    Moldova: "recommendations_Moldova_easy.json",
    Monaco: "recommendations_Monaco_easy.json",
    Montenegro: "recommendations_montenegro_easy.json",
    "North Macedonia": "recommendations_North_Macedonia_easy.json",
    Norway: "recommendations_Norway_easy.json",
    Poland: "recommendations_poland_easy.json",
    Portugal: "recommendations_portugal_easy.json",
    Romania: "recommendations_romania_easy.json",
    "Russia (Europe)": "recommendations_Russia_europe_easy.json",
    "San Marino": "recommendations_San_Marino_easy.json",
    Serbia: "recommendations_serbia_easy.json",
    Slovakia: "recommendations_slovakia_easy.json",
    Slovenia: "recommendations_Slovenia_easy.json",
    Spain: "recommendations_spain_easy.json",
    Sweden: "recommendations_Sweden_easy.json",
    Swizerland: "recommendations_Swizerland_easy.json",
    "Turkey (Europe)": "recommendations_Turkey_europe_easy.json",
    "United Kingdom": "recommendations_United_kingdom_easy.json"
  };

  // -----------------------------
  // TEXT BLOCK PARSER
  // -----------------------------
  function parseTextBlock(text) {
    if (!text) return "<p>No data available.</p>";

    const segments = text.split("|").map(s => s.trim()).filter(Boolean);

    return "<ul>" + segments.map(seg => {
      if (seg.includes(":")) {
        const idx = seg.indexOf(":");
        return `<li><strong>${seg.slice(0, idx)}:</strong> ${seg.slice(idx + 1).trim()}</li>`;
      }
      return `<li>${seg}</li>`;
    }).join("") + "</ul>";
  }

  // -----------------------------
  // FULL DAY PARSER
  // -----------------------------
  function parseFullDayText(text) {
    if (!text) return "<p>No itinerary available.</p>";

    let output = "";
    const parts = text.split("\n\n").map(p => p.trim()).filter(Boolean);

    parts.forEach(section => {
      const idx = section.indexOf(":");
      if (idx === -1) return;

      const title = section.slice(0, idx).trim();
      const content = section.slice(idx + 1).trim();

      output += `<h4>${title}</h4>`;
      output += parseTextBlock(content.replace(/→/g, "|"));
    });

    return output;
  }

  // -----------------------------
  // POPUNI DRŽAVE
  // -----------------------------
  function populateCountries() {
    Object.keys(countryMap).forEach(country => {
      const opt = document.createElement("option");
      opt.value = country;
      opt.textContent = country;
      countrySelect.appendChild(opt);
    });
  }
  populateCountries();

  // -----------------------------
  // SELECT DRŽAVA
  // -----------------------------
  countrySelect.addEventListener("change", function () {
    resetAll();

    const countryName = this.value;
    if (!countryName) return;

    const fileName = countryMap[countryName];
    if (!fileName) {
      errorMsg.textContent = "No data file for selected country.";
      return;
    }

    const path = `/assets/recommendations/countries/${fileName}`;

    fetch(path)
      .then(res => res.json())
      .then(json => {
        selectedCountry = json;
        populateCities(json.cities || []);
      })
      .catch(err => {
        console.error(err);
        errorMsg.textContent = "Failed to load data.";
      });
  });

  function populateCities(cities) {
    cities.forEach(city => {
      const opt = document.createElement("option");
      opt.value = city.name;
      opt.textContent = city.name;
      citySelect.appendChild(opt);
    });

    citySelect.disabled = false;
  }

  // -----------------------------
  // SELECT GRAD
  // -----------------------------
  citySelect.addEventListener("change", function () {
    selectedCityObj = selectedCountry?.cities?.find(c => c.name === this.value);
    submitBtn.disabled = !selectedCityObj;
  });

  // -----------------------------
  // SUBMIT
  // -----------------------------
  submitBtn.addEventListener("click", function () {

    resultDiv.innerHTML = "";
    errorMsg.textContent = "";

    if (!selectedCityObj) {
      errorMsg.textContent = "Please select a city.";
      return;
    }

    let html = "";

    // FULL DAY
    html += `<h3>🗓️ Full Day Plan</h3>`;
    html += parseFullDayText(selectedCityObj.full_day);

    // INTERESTS
    html += `<h3>🎯 Interests</h3>`;
    if (Array.isArray(selectedCityObj.interests)) {
      html += "<ul>" + selectedCityObj.interests.map(i => `<li>${i}</li>`).join("") + "</ul>";
    } else {
      html += `<p>No interests listed.</p>`;
    }

    // FOOD
    html += `<h3>🍽 Local Food</h3>`;
    html += `<p>${selectedCityObj.local_food_tip || "No food data available."}</p>`;

    // SEASONS
    html += `<h3>🌦 Seasonal Tips</h3>`;
    if (selectedCityObj.seasons) {
      Object.entries(selectedCityObj.seasons).forEach(([key, season]) => {
        html += `<h4>${capitalize(key)} – ${season.event || ""}</h4>`;
        if (Array.isArray(season.ideas)) {
          html += parseTextBlock(season.ideas.join("|"));
        } else {
          html += `<p>No seasonal tips.</p>`;
        }
      });
    }

    // TRANSPORT
    html += `<h3>🚆 Public Transport</h3>`;
    if (Array.isArray(selectedCityObj.public_transport_tips)) {
      html += parseTextBlock(selectedCityObj.public_transport_tips.join("|"));
    } else {
      html += `<p>No transport data.</p>`;
    }

    // EVENTS
    html += `<h3>🎉 City Events</h3>`;
    if (Array.isArray(selectedCityObj.city_events)) {
      html += "<ul>" + selectedCityObj.city_events.map(ev =>
        `<li><strong>${ev.name} (${capitalize(ev.season)}):</strong> ${ev.description}</li>`
      ).join("") + "</ul>";
    } else {
      html += `<p>No city events.</p>`;
    }

    resultDiv.innerHTML = html;
    resultWrapper.style.display = "block";
    setTimeout(() => {
      resultWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);

    // PDF
    savePdfBtn.onclick = function () {
      const options = {
        filename: `${selectedCityObj.name}-route.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4' }
      };

      savePdfBtn.style.display = "none";

      html2pdf()
        .from(resultWrapper)
        .set(options)
        .save()
        .then(() => savePdfBtn.style.display = "inline-block");
    };
  });

  // -----------------------------
  // HELPERS
  // -----------------------------
  function clearSelect(sel, placeholder) {
    sel.innerHTML = "";
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = placeholder;
    sel.appendChild(opt);
  }

  function resetAll() {
    clearSelect(citySelect, "Select a city");
    citySelect.disabled = true;
    submitBtn.disabled = true;
    selectedCityObj = null;
    resultWrapper.style.display = "none";
  }

  function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
  }
});

// ----------------------------------------------
// TOGGLE PANEL
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
        panel.classList.add("open");
        panel.classList.remove("collapsed");
        arrow.classList.add("open");

        setTimeout(() => {
          panel.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
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
