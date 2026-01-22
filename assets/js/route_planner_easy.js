// assets/js/route_planner_easy.js

document.addEventListener("includes:loaded", function () {
  const countrySelect = document.getElementById("route-country");
  const citySelect = document.getElementById("route-city");
  const submitBtn = document.getElementById("route-submit");
  const errorMsg = document.getElementById("route-error");
  const resultWrapper = document.querySelector(".route-result-wrapper");
  const resultDiv = document.getElementById("route-result");
  const savePdfBtn = document.getElementById("save-pdf-btn");
  const searchFeedback = document.getElementById("city-search-feedback");
  const searchContact = document.getElementById("city-search-contact");
  const searchInput = document.getElementById("city-search-input");
  const GEO_CITY_DATA_URL = "/destinations/cities_geolocation.json";

  const isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const getDefaultApiBase = () =>
    isLocalHost ? "http://localhost:3001" : window.location.origin;
  const runtimeConfigPromise = fetch("/runtime-config.json", {
    cache: "no-store",
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((config) => {
      if (!isLocalHost) return getDefaultApiBase();
      const configured = config && String(config.apiBaseUrl || "").trim();
      if (!configured) return getDefaultApiBase();
      const configuredIsLocal =
        configured.includes("localhost") || configured.includes("127.0.0.1");
      return configuredIsLocal ? configured : getDefaultApiBase();
    })
    .catch(() => getDefaultApiBase());

  let selectedCountry = null;
  let selectedCityObj = null;
  let pendingSelection = null;
  let pendingAutoSubmit = false;
  const countryDataCache = new Map();
  let geoCityCache = null;
  let geoCityLoadPromise = null;

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
    "Czech Republic": "recommendations_czech_easy.json",
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

    // Newer structure: object with section keys (Morning/Afternoon/Sunset/Night)
    if (typeof text === "object") {
      const preferredOrder = ["Morning", "Afternoon", "Sunset", "Night", "Evening"];
      const seen = new Set();
      let output = "";

      const normalizeContent = (value) => {
        if (Array.isArray(value)) return value.join("|");
        if (typeof value === "string") return value;
        if (value && typeof value === "object") return Object.values(value).join("|");
        return "";
      };

      const renderSection = (title, value) => {
        const content = normalizeContent(value);
        if (!content) return;
        output += `<h4>${title}</h4>`;
        output += parseTextBlock(content);
      };

      preferredOrder.forEach(key => {
        if (text[key] !== undefined) {
          seen.add(key);
          renderSection(key, text[key]);
        }
      });

      Object.entries(text).forEach(([key, value]) => {
        if (seen.has(key)) return;
        renderSection(key, value);
      });

      return output || "<p>No itinerary available.</p>";
    }

    // Legacy string structure.
    let output = "";
    const parts = String(text).split("\n\n").map(p => p.trim()).filter(Boolean);

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

    return output || "<p>No itinerary available.</p>";
  }

  // -----------------------------
  // SEASON HELPERS (old + new)
  // -----------------------------
  function normalizeSeasonEntry(entry) {
    if (typeof entry === "string") return entry;

    if (entry && typeof entry === "object") {
      const title = entry.name || entry.title || entry.label || "";
      const link = entry.map_link || entry.link;
      const desc = entry.description || entry.detail || "";

      let label = title;
      if (link) {
        const anchorText = title || "View on map";
        label = `<a href="${link}" target="_blank" rel="noopener noreferrer">${anchorText}</a>`;
      } else if (!label && desc) {
        label = desc;
      }

      if (!label) return "";
      return desc && label !== desc ? `${label}: ${desc}` : label;
    }

    return "";
  }

  function renderSeasonList(list) {
    if (!list) return "";
    const arr = Array.isArray(list) ? list : [list];
    const normalized = arr.map(normalizeSeasonEntry).filter(Boolean);
    return normalized.length ? parseTextBlock(normalized.join("|")) : "";
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
  if (searchContact) searchContact.hidden = true;
  if (searchContact) {
    searchContact.addEventListener("click", async (event) => {
      event.preventDefault();

      const cityName = searchInput?.value?.trim();
      if (!cityName) return;

      searchContact.setAttribute("aria-busy", "true");
      searchContact.style.pointerEvents = "none";

      const data = {
        name: "City Suggestion",
        email: "noreply@placestovisit.com",
        subject: "Suggestion from Places To Visit",
        message: `User suggested:\n${cityName}.`,
      };

      try {
        const apiBase = await runtimeConfigPromise;
        const response = await fetch(`${apiBase}/api/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          if (searchFeedback) {
            searchFeedback.textContent = "Thank You for Your suggestuin.";
            searchFeedback.style.color = "#16a34a";
          }
          searchContact.hidden = true;
        } else if (searchFeedback) {
          searchFeedback.textContent = "Unable to send suggestion.";
          searchFeedback.style.color = "#dc2626";
        }
      } catch (err) {
        if (searchFeedback) {
          searchFeedback.textContent = "Unable to send suggestion.";
          searchFeedback.style.color = "#dc2626";
        }
      } finally {
        searchContact.removeAttribute("aria-busy");
        searchContact.style.pointerEvents = "";
      }
    });
  }

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
    if (pendingAutoSubmit && selectedCityObj) {
      pendingAutoSubmit = false;
      submitBtn.click();
    }
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
        const eventText = season?.event ? ` – ${season.event}` : "";
        html += `<h4>${capitalize(key)}${eventText}</h4>`;

        if (season?.description) {
          html += `<p>${season.description}</p>`;
        }

        const ideasHtml = renderSeasonList(season?.ideas);
        const locationsHtml = renderSeasonList(season?.locations);

        if (ideasHtml || locationsHtml) {
          html += ideasHtml + locationsHtml;
        } else {
          html += `<p>No seasonal tips.</p>`;
        }
      });
    } else {
      html += `<p>No seasonal tips.</p>`;
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
    openPlannerPanel();
    setTimeout(() => {
      resultWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);

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
    const normalized = Array.isArray(list)
      ? list
      : (list && typeof list === "object")
        ? Object.entries(list).map(([category, items]) => ({
            name: category,
            activities: Array.isArray(items) ? items : []
          }))
        : null;

    if (!normalized) return "<p>No interests listed.</p>";

    const items = normalized.map(item => {
      if (typeof item === "string") return `<li>${item}</li>`;
      if (!item || typeof item !== "object") return "";

      // Nested activities (category + list of places)
      if (Array.isArray(item.activities)) {
        const activityItems = item.activities.map(act => {
          if (!act || typeof act !== "object") return "";
          const name = act.name || "";
          if (!name) return "";
          const desc = act.description ? `<div>${act.description}</div>` : "";
          const title = act.map_link
            ? `<a href="${act.map_link}" target="_blank" rel="noopener noreferrer">${name}</a>`
            : name;
          return `<li>${title}${desc}</li>`;
        }).filter(Boolean);

        if (!activityItems.length) return "";
        const header = item.name ? `<div><strong>${item.name}</strong></div>` : "";
        return `<li>${header}<ul>${activityItems.join("")}</ul></li>`;
      }

      // Flat interest item
      const text = item.name || "";
      if (!text) return "";
      const desc = item.description ? `<div>${item.description}</div>` : "";
      if (item.map_link) {
        return `<li><a href="${item.map_link}" target="_blank" rel="noopener noreferrer">${text}</a>${desc}</li>`;
      }
      return `<li>${text}${desc}</li>`;
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
        const href = item.link || item.map_link;
        if (href) {
          return `<li><a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>${desc}</li>`;
        }
        return `<li>${text}${desc}</li>`;
      }
      return "";
    }).filter(Boolean);

    return items.length ? `<ul>${items.join("")}</ul>` : `<p>${emptyMessage}</p>`;
  }

  function normalizeName(value) {
    return value
      ? value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
      : "";
  }

  function renderSuggestionsList(container, suggestions) {
    if (!container) return;
    container.innerHTML = "";
    if (!suggestions.length) return;

    const list = document.createElement("ul");
    list.className = "planner-search-suggestions";
    suggestions.forEach(item => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "planner-search-suggestion";
      button.textContent = item.label;
      button.addEventListener("click", () => {
        if (searchInput) searchInput.value = item.city;
        if (searchFeedback) searchFeedback.innerHTML = "";
        if (window.routePlannerEasy?.selectLocation) {
          window.routePlannerEasy.selectLocation(item.country, item.city, { autoSubmit: true });
        }
      });
      li.appendChild(button);
      list.appendChild(li);
    });
    container.appendChild(list);
  }

  function loadGeoCities() {
    if (geoCityCache) return Promise.resolve(geoCityCache);
    if (geoCityLoadPromise) return geoCityLoadPromise;

    geoCityLoadPromise = fetch(GEO_CITY_DATA_URL)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        geoCityCache = Array.isArray(data) ? data : [];
        return geoCityCache;
      })
      .catch(() => []);

    return geoCityLoadPromise;
  }

  async function findGeoCityMatch(query) {
    const normalizedQuery = normalizeName(query);
    if (!normalizedQuery) return null;

    const cities = await loadGeoCities();
    return cities.find((city) => {
      const name = normalizeName(city?.name);
      const routeName = normalizeName(city?.routeCity);
      return normalizedQuery === name || normalizedQuery === routeName;
    }) || null;
  }

  async function resolveCityName(countryName, cityName) {
    if (!countryName || !cityName) return cityName;
    const normalizedCity = normalizeName(cityName);
    if (!normalizedCity) return cityName;

    const cities = await loadGeoCities();
    const match = cities.find((city) => {
      const sameCountry = normalizeName(city?.country) === normalizeName(countryName);
      if (!sameCountry) return false;
      const name = normalizeName(city?.name);
      const routeName = normalizeName(city?.routeCity);
      return normalizedCity === name || normalizedCity === routeName;
    });

    return match?.name || cityName;
  }

  async function loadCountryData(countryName) {
    if (!countryName) return null;
    const cached = countryDataCache.get(countryName);
    if (cached) return cached;

    const fileName = countryMap[countryName];
    if (!fileName) return null;

    const path = `/assets/recommendations/countries/${fileName}`;
    const res = await fetch(path);
    if (!res.ok) throw new Error("Failed to load country data.");
    const json = await res.json();
    countryDataCache.set(countryName, json);
    return json;
  }

  async function searchCityAcrossCountries(query) {
    const normalizedQuery = normalizeName(query);
    if (!normalizedQuery) return null;

    const geoMatch = await findGeoCityMatch(query);
    if (geoMatch?.country && geoMatch?.name) {
      return { country: geoMatch.country, city: geoMatch.name };
    }

    for (const countryName of Object.keys(countryMap)) {
      const data = await loadCountryData(countryName);
      const match = data?.cities?.find(city => {
        const name = normalizeName(city?.name);
        const routeName = normalizeName(city?.routeCity);
        return name === normalizedQuery || routeName === normalizedQuery;
      });
      if (match) {
        return { country: countryName, city: match.name };
      }
    }

    return null;
  }

  async function getCitySuggestions(query, limit = 5) {
    const normalizedQuery = normalizeName(query);
    if (!normalizedQuery) return [];

    const suggestions = [];
    const seen = new Set();
    const addSuggestion = (country, cityName, routeCity) => {
      if (!cityName || !country) return;
      const key = `${normalizeName(country)}|${normalizeName(cityName)}`;
      if (seen.has(key)) return;
      const routeLabel = routeCity && normalizeName(routeCity) !== normalizeName(cityName)
        ? ` (${routeCity})`
        : "";
      suggestions.push({
        country,
        city: cityName,
        label: `${cityName}${routeLabel} - ${country}`
      });
      seen.add(key);
    };

    const geoCities = await loadGeoCities();
    if (geoCities.length) {
      for (const city of geoCities) {
        const name = normalizeName(city?.name);
        const routeName = normalizeName(city?.routeCity);
        if (name.includes(normalizedQuery) || routeName.includes(normalizedQuery)) {
          addSuggestion(city?.country, city?.name, city?.routeCity);
        }
        if (suggestions.length >= limit) return suggestions;
      }
    }

    for (const countryName of Object.keys(countryMap)) {
      const data = await loadCountryData(countryName);
      const cities = data?.cities || [];
      for (const city of cities) {
        const name = normalizeName(city?.name);
        if (name.includes(normalizedQuery)) {
          addSuggestion(countryName, city?.name);
        }
        if (suggestions.length >= limit) return suggestions;
      }
    }

    return suggestions;
  }

  function applyPendingCitySelection() {
    if (!pendingSelection) return;
    if (pendingSelection.country && countrySelect.value !== pendingSelection.country) return;

    const targetCity = pendingSelection.city;
    if (!targetCity) return;

    const targetNormalized = normalizeName(targetCity);
    const match = Array.from(citySelect.options).find(opt =>
      normalizeName(opt.value) === targetNormalized
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
  window.routePlannerEasy.selectLocation = async function (countryName, cityName, options = {}) {
    if (!countryName) return;
    const resolvedCity = await resolveCityName(countryName, cityName);
    pendingSelection = { country: countryName, city: resolvedCity || cityName };
    pendingAutoSubmit = Boolean(options.autoSubmit);

    openPlannerPanel();

    if (countrySelect.value !== countryName) {
      countrySelect.value = countryName;
      countrySelect.dispatchEvent(new Event("change"));
    } else {
      applyPendingCitySelection();
    }
  };
  window.routePlannerEasy.openPanel = openPlannerPanel;
  window.routePlannerEasy.searchAndSelectCity = async function (query) {
    const trimmed = query?.trim();
    if (!trimmed) return false;

    errorMsg.textContent = "";
    if (searchFeedback) {
      searchFeedback.textContent = "";
      searchFeedback.style.color = "";
    }
    if (searchContact) searchContact.hidden = true;
    try {
      const match = await searchCityAcrossCountries(trimmed);
      if (!match) {
        if (searchFeedback) {
          searchFeedback.textContent = "City not found. Make a suggestion !";
          searchFeedback.style.color = "";
        }
        if (searchContact) searchContact.hidden = false;
        return false;
      }
      window.routePlannerEasy.selectLocation(match.country, match.city, { autoSubmit: true });
      return true;
    } catch (err) {
      console.error(err);
      if (searchFeedback) {
        searchFeedback.textContent = "Failed to search city.";
      }
      if (searchContact) searchContact.hidden = false;
      return false;
    }
  };

  document.dispatchEvent(new Event("routePlanner:ready"));

  let suggestionTimer = null;
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      if (suggestionTimer) clearTimeout(suggestionTimer);
      const query = searchInput.value.trim();

      if (!query) {
        if (searchFeedback) {
          searchFeedback.textContent = "";
          searchFeedback.style.color = "";
        }
        if (searchContact) searchContact.hidden = true;
        return;
      }

      suggestionTimer = setTimeout(async () => {
        const suggestions = await getCitySuggestions(query, 5);
        if (searchFeedback) {
          renderSuggestionsList(searchFeedback, suggestions);
          searchFeedback.style.color = "";
        }
        if (searchContact) searchContact.hidden = true;
      }, 200);
    });
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
  const searchInput = document.getElementById("city-search-input");

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
        const query = searchInput?.value?.trim();
        if (query && window.routePlannerEasy?.searchAndSelectCity) {
          window.routePlannerEasy.searchAndSelectCity(query);
          return;
        }

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
