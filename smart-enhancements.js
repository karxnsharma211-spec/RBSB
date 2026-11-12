/* RBSBEVENTS smart customer helpers — lightweight, no paid API required. */
(() => {
  const places = ["Ludhiana, Punjab", "Chandigarh", "Amritsar, Punjab", "Jalandhar, Punjab", "Patiala, Punjab", "Delhi", "New Delhi", "Mumbai", "Jaipur", "Shimla", "Mohali, Punjab", "Bathinda, Punjab"];
  const categories = ["Wedding", "Birthday Party", "Corporate Event", "Engagement", "Anniversary", "Baby Shower", "Concert", "Conference", "Private Party", "Catering", "Photography", "Decoration", "Entertainment"];
  const normal = value => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").trim();
  function distance(a, b) {
    const row = Array.from({length: b.length + 1}, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = row[0]; row[0] = i;
      for (let j = 1; j <= b.length; j++) { const old = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = old; }
    }
    return row[b.length];
  }
  function attachAutocomplete(input, source) {
    if (!input || input.dataset.smartSuggestReady) return;
    input.dataset.smartSuggestReady = "1";
    input.setAttribute("autocomplete", "off");
    const wrap = document.createElement("div"); wrap.className = "smart-suggest-wrap";
    input.parentNode.insertBefore(wrap, input); wrap.appendChild(input);
    const list = document.createElement("div"); list.className = "smart-suggest-list"; list.hidden = true; list.setAttribute("role", "listbox"); wrap.appendChild(list);
    let active = -1, current = [];
    const close = () => { list.hidden = true; active = -1; };
    const choose = value => { input.value = value; close(); input.dispatchEvent(new Event("input", {bubbles:true})); input.dispatchEvent(new Event("change", {bubbles:true})); };
    input.addEventListener("input", () => {
      const q = normal(input.value); list.innerHTML = ""; active = -1;
      if (q.length < 2) { close(); return; }
      current = source.map(label => ({label, key: normal(label)})).map(item => ({...item, score: item.key.startsWith(q) ? 0 : item.key.includes(q) ? 1 : distance(q, item.key.split(" ")[0]) <= Math.max(1, Math.floor(q.length * .34)) ? 2 : 9})).filter(x => x.score < 3).sort((a,b) => a.score-b.score).slice(0,5);
      if (!current.length) { close(); return; }
      current.forEach((item, index) => { const option = document.createElement("button"); option.type = "button"; option.className = "smart-suggest-option"; option.setAttribute("role", "option"); option.textContent = item.label; option.addEventListener("mousedown", e => { e.preventDefault(); choose(item.label); }); list.appendChild(option); });
      list.hidden = false;
    });
    input.addEventListener("keydown", e => { const options = [...list.querySelectorAll("button")]; if (!options.length) return; if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); active = (active + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length; options.forEach((el,i) => el.classList.toggle("active", i === active)); } else if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(current[active].label); } else if (e.key === "Escape") close(); });
    input.addEventListener("blur", () => setTimeout(close, 120));
  }
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('#venueLocation, #eventLocation, [data-smart-suggest="location"], input[placeholder*="location" i], input[placeholder*="city" i]').forEach(input => attachAutocomplete(input, places));
    document.querySelectorAll('[data-smart-suggest="category"], #eventCategory, input[placeholder*="event type" i]').forEach(input => attachAutocomplete(input, categories));

    const countries = [{n:"India",c:"+91",f:"🇮🇳"},{n:"United States",c:"+1",f:"🇺🇸"},{n:"United Kingdom",c:"+44",f:"🇬🇧"},{n:"Canada",c:"+1",f:"🇨🇦"},{n:"United Arab Emirates",c:"+971",f:"🇦🇪"},{n:"Australia",c:"+61",f:"🇦🇺"},{n:"Singapore",c:"+65",f:"🇸🇬"},{n:"New Zealand",c:"+64",f:"🇳🇿"},{n:"Pakistan",c:"+92",f:"🇵🇰"},{n:"Nepal",c:"+977",f:"🇳🇵"},{n:"Bangladesh",c:"+880",f:"🇧🇩"},{n:"Germany",c:"+49",f:"🇩🇪"},{n:"France",c:"+33",f:"🇫🇷"},{n:"Saudi Arabia",c:"+966",f:"🇸🇦"}];
    document.querySelectorAll('input[type="tel"]').forEach(input => {
      if (input.dataset.countryCodeReady) return; input.dataset.countryCodeReady = "1";
      const parent = input.parentElement; const select = document.createElement("select"); select.className = "smart-country-code"; select.setAttribute("aria-label", "Country calling code");
      countries.forEach(country => { const option = document.createElement("option"); option.value = country.c; option.textContent = `${country.f} ${country.c}`; option.title = country.n; select.appendChild(option); });
      const row = document.createElement("div"); row.className = "smart-phone-row"; parent.insertBefore(row, input); row.append(select, input); input.placeholder = "Phone number"; input.autocomplete = "tel-national";
      // Store the full international number without changing the visible national number.
      const form = input.closest("form"); if (form) form.addEventListener("submit", () => { input.dataset.nationalValue = input.value.trim(); input.value = `${select.value} ${input.dataset.nationalValue}`; }, true);
    });
  });
})();
