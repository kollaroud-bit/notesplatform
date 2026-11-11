(function () {
  "use strict";
  const CFG = window.SITE_CONFIG || {};
  const NOTES = window.NOTES || [];
  const COURSES = window.COURSES || [];
  const FAQ = window.FAQ || [];
  const M365 = window.M365 || { steps: [] };

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Αναζήτηση χωρίς τόνους και πεζά/κεφαλαία
  const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ς/g, "σ");
  const empty = (msg) => `<div class="empty">${msg}</div>`;

  /* ---------- Καρτέλες ---------- */
  const tabs = document.querySelectorAll(".tabs button");
  function showTab(name) {
    tabs.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
    document.querySelectorAll(".panel").forEach((p) => (p.hidden = p.id !== "tab-" + name));
  }
  tabs.forEach((b) => b.addEventListener("click", () => { history.replaceState(null, "", "#" + b.dataset.tab); showTab(b.dataset.tab); }));
  const initial = location.hash.slice(1);
  showTab([...tabs].some((b) => b.dataset.tab === initial) ? initial : "notes");

  /* ---------- 1. Σημειώσεις ---------- */
  const submit = $("#submit-btn");
  if (CFG.googleFormUrl) submit.href = CFG.googleFormUrl;
  else { submit.classList.add("disabled"); submit.textContent = "Φόρμα αποστολής: σύντομα"; }

  function fileType(path) {
    const ext = path.split(".").pop().toLowerCase();
    return ext === "pdf" ? "PDF" : (ext === "doc" || ext === "docx") ? "Word" : ext.toUpperCase();
  }
  function renderNotes() {
    const q = norm($("#notes-search").value);
    const items = NOTES.filter((n) => !q || norm(n.course + " " + n.title + " " + (n.author || "")).includes(q));
    if (!NOTES.length) return ($("#notes-list").innerHTML = empty("Δεν έχουν ανέβει ακόμη σημειώσεις."));
    if (!items.length) return ($("#notes-list").innerHTML = empty("Δεν βρέθηκαν σημειώσεις για αυτή την αναζήτηση."));
    const groups = {};
    items.forEach((n) => (groups[n.course] = groups[n.course] || []).push(n));
    $("#notes-list").innerHTML = Object.keys(groups).sort((a, b) => a.localeCompare(b, "el")).map((c) => `
      <div class="card course-group">
        <h3>${esc(c)}</h3>
        ${groups[c].map((n) => `
          <div class="file-row">
            <div>
              <span class="badge">${fileType(n.file)}</span>${esc(n.title)}
              <div class="file-meta">${[n.author && "Από: " + esc(n.author), n.date && esc(n.date)].filter(Boolean).join(" · ")}</div>
            </div>
            <a class="btn" href="${esc(n.file)}" download>Κατέβασμα</a>
          </div>`).join("")}
      </div>`).join("");
  }
  $("#notes-search").addEventListener("input", renderNotes);
  renderNotes();

  /* ---------- 2. Πρόγραμμα σπουδών ---------- */
  const src = CFG.studyGuide || {};
  $("#program-source").innerHTML = src.url
    ? `Πηγή: <a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.title || "Οδηγός Σπουδών")}</a>`
    : "Πηγή: Οδηγός Σπουδών 2026-2027 (εκκρεμεί η προσθήκη).";
  $("#faq-source").innerHTML = $("#program-source").innerHTML + " Κάθε απάντηση αναφέρει τη σελίδα του Οδηγού.";

  const uniq = (k) => [...new Set(COURSES.map((c) => c[k]).filter((v) => v !== undefined && v !== ""))];
  const fill = (sel, vals, label) => vals.forEach((v) => sel.insertAdjacentHTML("beforeend", `<option value="${esc(v)}">${esc(label(v))}</option>`));
  fill($("#f-year"), uniq("year").sort((a, b) => a - b), (v) => v + "ο έτος");
  const GR = ["", "Α΄", "Β΄", "Γ΄", "Δ΄", "Ε΄", "ΣΤ΄", "Ζ΄", "Η΄"];
  fill($("#f-sem"), uniq("semester").sort((a, b) => a - b), (v) => (GR[v] || v) + " εξάμηνο");
  fill($("#f-type"), uniq("type").sort((a, b) => a.localeCompare(b, "el")), (v) => v);

  const typeClass = (t) => (t === "Υποχρεωτικό" ? "u" : t === "Υποχρεωτικής επιλογής" ? "ye" : "ee");
  function renderProgram() {
    if (!COURSES.length) return ($("#program-list").innerHTML = empty("Τα μαθήματα θα προστεθούν από τον Οδηγό Σπουδών 2026-2027."));
    const q = norm($("#prog-search").value), y = $("#f-year").value, s = $("#f-sem").value, t = $("#f-type").value;
    const items = COURSES.filter((c) =>
      (!q || norm(c.title + " " + c.code + " " + c.sector).includes(q)) &&
      (!y || String(c.year) === y) && (!s || String(c.semester) === s) && (!t || c.type === t));
    if (!items.length) return ($("#program-list").innerHTML = empty("Κανένα μάθημα δεν ταιριάζει με τα φίλτρα."));
    const groups = {};
    items.forEach((c) => { const k = c.year + "|" + c.semester; (groups[k] = groups[k] || []).push(c); });
    $("#program-list").innerHTML = Object.keys(groups).sort((a, b) => {
      const [ay, as] = a.split("|").map(Number), [by, bs] = b.split("|").map(Number); return ay - by || as - bs;
    }).map((k) => {
      const [yr, sm] = k.split("|");
      return `<h3 class="sem-title">${esc(yr)}ο έτος · ${esc(GR[sm] || sm)} εξάμηνο</h3>
      <table><thead><tr><th>Κωδικός</th><th>Μάθημα</th><th>ECTS</th><th>Είδος</th><th>Τομέας / Ενότητα</th></tr></thead><tbody>
      ${groups[k].map((c) => `<tr>
        <td data-label="Κωδικός">${esc(c.code)}</td>
        <td data-label="Μάθημα">${esc(c.title)}${c.note ? `<div class="note">${esc(c.note)}</div>` : ""}</td>
        <td data-label="ECTS">${esc(c.ects)}</td><td data-label="Είδος"><span class="type t-${typeClass(c.type)}">${esc(c.type)}</span></td>
        <td data-label="Τομέας / Ενότητα" class="sector">${esc(c.sector)}</td></tr>`).join("")}
      </tbody></table>
      <p class="page-ref">Οδηγός Σπουδών 2026-2027, σελ. ${esc(groups[k][0].page)}</p>`;
    }).join("");
  }
  ["#prog-search", "#f-year", "#f-sem", "#f-type"].forEach((id) => $(id).addEventListener("input", renderProgram));
  renderProgram();

  /* ---------- 3. FAQ ---------- */
  function renderFaq() {
    if (!FAQ.length) return ($("#faq-list").innerHTML = empty("Οι ερωτήσεις θα προστεθούν με βάση τον Οδηγό Σπουδών 2026-2027."));
    const q = norm($("#faq-search").value);
    const items = FAQ.filter((f) => !q || norm(f.q + " " + f.a).includes(q));
    if (!items.length) return ($("#faq-list").innerHTML = empty("Δεν βρέθηκε σχετική ερώτηση."));
    $("#faq-list").innerHTML = items.map((f) => `
      <details class="card"><summary>${esc(f.q)}</summary>
        <p>${esc(f.a)}</p>
        <span class="page-ref">Οδηγός Σπουδών 2026-2027, σελ. ${esc(f.page)}</span>
      </details>`).join("");
  }
  $("#faq-search").addEventListener("input", renderFaq);
  renderFaq();

  /* ---------- 4. Microsoft 365 ---------- */
  $("#m365-source").innerHTML = M365.sourceUrl
    ? `Πηγή: <a href="${esc(M365.sourceUrl)}" target="_blank" rel="noopener">${esc(M365.sourceTitle || "Κέντρο Λειτουργίας και Διαχείρισης Δικτύου ΕΚΠΑ")}</a>`
    : "Πηγή: σελίδα του Κέντρου Δικτύου ΕΚΠΑ (εκκρεμεί η προσθήκη).";
  if (M365.intro) {
    $("#m365-info").innerHTML = `
      <p>${esc(M365.intro)}</p>
      <div class="two-col">
        <div class="card"><h3>Σε ποιον απευθύνεται</h3><ul>${(M365.eligible || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          <p class="file-meta">${esc(M365.eligibleNote || "")}</p></div>
        <div class="card"><h3>Τι περιλαμβάνει</h3><ul>${(M365.includes || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      </div>`;
  }
  $("#m365-steps").innerHTML = M365.steps.length
    ? M365.steps.map((s) => `<li class="card">${esc(s.text)}${s.link ? `<div><a class="btn" style="margin-top:8px" href="${esc(s.link)}" target="_blank" rel="noopener">${esc(s.link.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a></div>` : ""}</li>`).join("")
    : `<li style="padding:0">${empty("Τα βήματα θα προστεθούν από την επίσημη σελίδα του Κέντρου Δικτύου ΕΚΠΑ.")}</li>`;
  $("#m365-warning").textContent = M365.warning ? "⚠ " + M365.warning : "";
})();
