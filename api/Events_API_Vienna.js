// --- Events API: Vienna ---

/**
 * Dohvata listu događaja za Beč (Vienna) putem Events in Vienna API
 * @returns {Promise<Array>} — niz događaja
 */
async function fetchViennaEvents() {
  // Primer URL za “Events in Vienna API”
  const url = `https://api.store/austria-api/bundesministerium-fur-digitalisierung-und-wirtschaftsstandort-bmdw-api/events-in-vienna-api`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Events API error: ${resp.status}`);
  }
  const data = await resp.json();
  // Pretpostavimo da data.events ili data.data sadrži niz događaja
  return data.events || data.data || [];
}

/**
 * Renderuj događaje u HTML karticu
 */
async function showViennaEvents() {
  try {
    const events = await fetchViennaEvents();
    const card = document.createElement('div');
    card.className = 'city-events-card';

    let html = `<h3>Događaji u Beču</h3>`;
    if (events.length === 0) {
      html += `<p>Nema dostupnih događaja.</p>`;
    } else {
      html += `<ul>`;
      events.forEach(ev => {
        html += `<li><strong>${ev.title || ev.name}</strong>`;
        if (ev.date) html += ` — ${ev.date}`;
        if (ev.location) html += `, ${ev.location}`;
        html += `</li>`;
      });
      html += `</ul>`;
    }

    card.innerHTML = html;
    document.body.appendChild(card);
  } catch (err) {
    console.error("Greška pri fetch‑ovanju događaja:", err);
  }
}

// Primer korišćenja (za Beč)
showViennaEvents();
