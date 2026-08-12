(function () {
  if (typeof pages === "undefined" || !Array.isArray(pages)) return;

  var STORAGE_KEY = "studyhub:progress";

  function courseKey() {
    var file = location.pathname.split("/").pop() || "";
    return file.replace(/\.html$/i, "") || "unknown";
  }
  var COURSE = courseKey();

  function loadAll() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveAll(all) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch (e) {}
  }
  function getRead() {
    var all = loadAll();
    var c = all[COURSE];
    return (c && Array.isArray(c.read)) ? c.read.slice() : [];
  }
  function persist() {
    var all = loadAll();
    all[COURSE] = { read: readIds, total: pages.length, updatedAt: Date.now() };
    saveAll(all);
  }

  var readIds = getRead();
  function isRead(id) { return readIds.indexOf(id) !== -1; }
  function toggle(id) {
    var i = readIds.indexOf(id);
    if (i === -1) readIds.push(id); else readIds.splice(i, 1);
    persist();
    render();
  }

  var style = document.createElement("style");
  style.textContent =
    ".navbtn .chk{margin-left:auto;flex:0 0 22px;width:22px;height:22px;border-radius:6px;" +
    "border:1px solid var(--border,#2d333b);display:grid;place-items:center;font-size:13px;" +
    "color:var(--muted,#9aa7b4);cursor:pointer;transition:background .15s,border-color .15s,color .15s}" +
    ".navbtn .chk:hover{border-color:var(--accent2,#4aa3ff);color:var(--accent2,#4aa3ff)}" +
    ".navbtn .chk.done{background:var(--green,#3fb950);border-color:var(--green,#3fb950);color:#08150c}" +
    ".progwrap{padding:0 10px 14px}" +
    ".progwrap .ptrack{height:6px;border-radius:4px;background:var(--panel2,#1c2330);overflow:hidden}" +
    ".progwrap .pfill{height:100%;background:linear-gradient(90deg,var(--accent,#ff8c42),var(--accent2,#4aa3ff));transition:width .2s}" +
    ".progwrap .ptext{font-size:11.5px;color:var(--muted,#9aa7b4);margin-top:6px;display:flex;justify-content:space-between}";
  document.head.appendChild(style);

  function ensureSummary() {
    var el = document.getElementById("progSummary");
    if (el) return el;
    var brand = document.querySelector(".sidebar .brand");
    if (!brand) return null;
    el = document.createElement("div");
    el.className = "progwrap";
    el.id = "progSummary";
    el.innerHTML =
      '<div class="ptrack"><div class="pfill" id="progFill" style="width:0%"></div></div>' +
      '<div class="ptext"><span id="progText">0/0 সম্পন্ন</span><span id="progPct">0%</span></div>';
    brand.appendChild(el);
    return el;
  }

  function render() {
    var total = pages.length;
    var done = readIds.length;
    var pct = total ? Math.round((done / total) * 100) : 0;

    ensureSummary();
    var fill = document.getElementById("progFill");
    var text = document.getElementById("progText");
    var pctEl = document.getElementById("progPct");
    if (fill) fill.style.width = pct + "%";
    if (text) text.textContent = done + "/" + total + " সম্পন্ন";
    if (pctEl) pctEl.textContent = pct + "%";

    document.querySelectorAll(".navbtn").forEach(function (btn) {
      var pid = btn.dataset.target;
      var chk = btn.querySelector(".chk");
      if (!chk) {
        chk = document.createElement("span");
        chk.className = "chk";
        chk.setAttribute("role", "checkbox");
        chk.title = "পড়া সম্পন্ন হিসেবে মার্ক করুন";
        chk.addEventListener("click", function (e) {
          e.stopPropagation();
          toggle(pid);
        });
        btn.appendChild(chk);
      }
      var read = isRead(pid);
      chk.classList.toggle("done", read);
      chk.setAttribute("aria-checked", read ? "true" : "false");
      chk.textContent = read ? "✓" : "";
    });
  }

  function init() {
    render();
    persist();
  }

  if (document.readyState === "complete" || document.readyState === "interactive") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
