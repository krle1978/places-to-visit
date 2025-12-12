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
  let pendingSelection = null;

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

    const splitOutsideTags = (seg) => {
      let inTag = false;
      for (let i = 0; i < seg.length; i++) {
        const ch = seg[i];
        if (ch === "<") inTag = true;
        else if (ch === ">") inTag = false;
        else if (ch === ":" && !inTag) return [seg.slice(0, i).trim(), seg.slice(i + 1).trim()];
      }
      return null;
    };

    return "<ul>" + segments.map(seg => {
      const split = splitOutsideTags(seg);
      if (split) {
        const [label, rest] = split;
        return `<li><strong>${label}:</strong> ${rest}</li>`;
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
      // Normalize separators so each stop becomes its own list item (supports arrow and legacy marker).
      output += parseTextBlock(
        content
          .replace(/ƒÅ'/g, "|")
          .replace(/→/g, "|")
      );
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
        applyPendingCitySelection();
      })
      .catch(err => {
        console.error(err);
        errorMsg.textContent = "Failed to load data.";
      });
  });

  function populateCities(cities) {
    clearSelect(citySelect, "Select a city");
    cities.forEach(city => {
      const opt = document.createElement("option");
      opt.value = city.name;
      opt.textContent = city.name;
      citySelect.appendChild(opt);
    });

    citySelect.disabled = false;
    applyPendingCitySelection();
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
    html += renderInterests(selectedCityObj.interests);

    // PLACES
    html += `<h3>Places</h3>`;
    html += renderLinkList(selectedCityObj.places, "No places listed.");

    // HIDDEN GEMS
    html += `<h3>Hidden Gems</h3>`;
    html += renderLinkList(selectedCityObj.hidden_gems, "No hidden gems listed.");

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
    html += renderPublicTransport(selectedCityObj.public_transport_tips);

    // EVENTS
    html += `<h3>🎉 City Events</h3>`;
    if (Array.isArray(selectedCityObj.city_events)) {
      html += "<ul>" + selectedCityObj.city_events.map(ev => {
        const title = ev?.website
          ? `<a href="${ev.website}" target="_blank" rel="noopener noreferrer">${ev.name || "Event"}</a>`
          : (ev?.name || "Event");
        const season = capitalize(ev?.season);
        const desc = ev?.description?.trim() || "";
        const rawDates = ev?.dates || "";
        const cleanedDates = rawDates.replace(/^\s*\n?/, "");
        const datesLine = cleanedDates
          ? (/^<b>\s*Duration:/i.test(cleanedDates) ? cleanedDates : `<b>Duration:</b> ${cleanedDates}`)
          : "";
        const descHtml = desc ? `<div style="white-space: pre-line;">${desc}</div>` : "";
        const datesHtml = datesLine ? `<div style="white-space: pre-line;">${datesLine}</div>` : "";
        return `<li><strong>${title}${season ? ` (${season})` : ""}:</strong>${descHtml}${datesHtml}</li>`;
      }).join("") + "</ul>";
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

  function renderPublicTransport(list) {
    if (!Array.isArray(list)) return "<p>No transport data.</p>";

    const items = list.map(item => {
      if (typeof item === "string") return `<li>${item}</li>`;
      if (item && typeof item === "object") {
        const text = item.tip || "";
        if (!text) return "";
        if (item.link) {
          return `<li><a href="${item.link}" target="_blank" rel="noopener noreferrer">${text}</a></li>`;
        }
        return `<li>${text}</li>`;
      }
      return "";
    }).filter(Boolean);

    return items.length ? `<ul>${items.join("")}</ul>` : "<p>No transport data.</p>";
  }

  function renderInterests(list) {
    if (!Array.isArray(list)) return "<p>No interests listed.</p>";

    const items = list.map(item => {
      if (typeof item === "string") return `<li>${item}</li>`;
      if (item && typeof item === "object") {
        const text = item.name || "";
        if (!text) return "";
        const desc = item.description ? `<div>${item.description}</div>` : "";
        if (item.map_link) {
          return `<li><a href="${item.map_link}" target="_blank" rel="noopener noreferrer">${text}</a>${desc}</li>`;
        }
        return `<li>${text}${desc}</li>`;
      }
      return "";
    }).filter(Boolean);

    return items.length ? `<ul>${items.join("")}</ul>` : "<p>No interests listed.</p>";
  }

  function renderLinkList(list, emptyMessage) {
    if (!Array.isArray(list)) return `<p>${emptyMessage}</p>`;

    const items = list.map(item => {
      if (typeof item === "string") return `<li>${item}</li>`;
      if (item && typeof item === "object") {
        const text = item.name || item.title || "";
        if (!text) return "";
        const desc = item.description ? `<div>${item.description}</div>` : "";
        if (item.link) {
          return `<li><a href="${item.link}" target="_blank" rel="noopener noreferrer">${text}</a>${desc}</li>`;
        }
        return `<li>${text}${desc}</li>`;
      }
      return "";
    }).filter(Boolean);

    return items.length ? `<ul>${items.join("")}</ul>` : `<p>${emptyMessage}</p>`;
  }

  function applyPendingCitySelection() {
    if (!pendingSelection) return;
    if (pendingSelection.country && countrySelect.value !== pendingSelection.country) return;

    const targetCity = pendingSelection.city;
    if (!targetCity) return;

    const match = Array.from(citySelect.options).find(opt =>
      opt.value.toLowerCase() === targetCity.toLowerCase()
    );

    if (match) {
      citySelect.value = match.value;
      citySelect.dispatchEvent(new Event("change"));
      pendingSelection = null;
    }
  }

  function openPlannerPanel() {
    const panel = document.getElementById("route-planner-panel");
    const arrow = document.getElementById("route-arrow");
    if (!panel) return;

    panel.classList.add("open");
    panel.classList.remove("collapsed");
    if (arrow) arrow.classList.add("open");

    setTimeout(() => {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }

  window.routePlannerEasy = window.routePlannerEasy || {};
  window.routePlannerEasy.selectLocation = function (countryName, cityName) {
    if (!countryName) return;
    pendingSelection = { country: countryName, city: cityName };

    openPlannerPanel();

    if (countrySelect.value !== countryName) {
      countrySelect.value = countryName;
      countrySelect.dispatchEvent(new Event("change"));
    } else {
      applyPendingCitySelection();
    }
  };
  window.routePlannerEasy.openPanel = openPlannerPanel;

  document.dispatchEvent(new Event("routePlanner:ready"));
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
