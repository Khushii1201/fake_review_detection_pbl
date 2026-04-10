/*
  content.js  v2.0
  Features:
  - Inline badges on every Amazon review
  - Hover card with full breakdown
  - Auto-highlight suspicious sentences in fake reviews
  - Summary banner at top of review section
  - Block/hide fake reviews toggle
  - Credibility score per review
*/

const API = "http://localhost:5000/predict";

/* ── State ────────────────────────────────────────────────────────────────── */
let hideFakes   = false;
let processed   = [];   // {el, data, badge}
let scanDone    = false;

/* ── CSS ──────────────────────────────────────────────────────────────────── */
(function injectCSS() {
  if (document.getElementById("frd-css")) return;
  const s = document.createElement("style");
  s.id = "frd-css";
  s.textContent = `
  /* ── Badge ── */
  .frd-wrap { display:inline-block; margin-top:10px; position:relative; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  .frd-badge {
    display:inline-flex; align-items:center; gap:7px;
    padding:5px 14px; border-radius:99px; font-size:12px; font-weight:600;
    border:1.5px solid transparent; cursor:pointer; transition:all .2s; user-select:none;
  }
  .frd-badge.loading { background:#f1f5f9; border-color:#cbd5e1; color:#64748b; }
  .frd-badge.fake    { background:#fff1f2; border-color:#fda4af; color:#be123c; }
  .frd-badge.real    { background:#f0fdf4; border-color:#86efac; color:#15803d; }
  .frd-badge.error   { background:#f8fafc; border-color:#e2e8f0; color:#94a3b8; font-size:11px; cursor:default; }
  .frd-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
  .frd-badge.loading .frd-dot { background:#94a3b8; animation:frd-pulse 1s infinite; }
  .frd-badge.fake    .frd-dot { background:#f43f5e; }
  .frd-badge.real    .frd-dot { background:#10b981; }
  @keyframes frd-pulse { 0%,100%{opacity:1} 50%{opacity:.2} }

  /* ── Credibility bar ── */
  .frd-cred {
    display:inline-flex; align-items:center; gap:6px;
    margin-left:8px; vertical-align:middle;
  }
  .frd-cred-track { width:60px; height:5px; background:#e2e8f0; border-radius:99px; overflow:hidden; }
  .frd-cred-fill  { height:100%; border-radius:99px; transition:width .8s ease; }
  .frd-cred-fill.fake { background:#f43f5e; }
  .frd-cred-fill.real { background:#10b981; }
  .frd-cred-label { font-size:10px; font-weight:700; }
  .frd-cred-label.fake { color:#be123c; }
  .frd-cred-label.real { color:#15803d; }

  /* ── Hover card ── */
  .frd-card {
    display:none; position:absolute; bottom:calc(100% + 10px); left:0; z-index:999999;
    width:270px; background:#1e293b; border-radius:13px; padding:16px;
    box-shadow:0 12px 40px rgba(0,0,0,.4); pointer-events:none;
    animation:frd-fade .15s ease;
  }
  @keyframes frd-fade { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
  .frd-badge:hover + .frd-card { display:block; }
  .frd-card::after { content:''; position:absolute; top:100%; left:20px; border:7px solid transparent; border-top-color:#1e293b; }

  .frd-cv { font-size:15px; font-weight:800; margin-bottom:10px; letter-spacing:-.2px; }
  .frd-cv.fake { color:#fb7185; } .frd-cv.real { color:#34d399; }
  .frd-cr { display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px; }
  .frd-cl { color:#64748b; } .frd-cval { font-weight:700; color:#f1f5f9; }
  .frd-bar { height:4px; background:#334155; border-radius:99px; overflow:hidden; margin:7px 0 10px; }
  .frd-bar-f { height:100%; border-radius:99px; }
  .frd-bar-f.fake { background:#f43f5e; } .frd-bar-f.real { background:#10b981; }
  .frd-sep { border:none; border-top:1px solid #334155; margin:10px 0; }
  .frd-kt { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px; }
  .frd-chips { display:flex; flex-wrap:wrap; gap:4px; }
  .frd-chip { font-size:10px; font-weight:700; padding:2px 8px; border-radius:99px; }
  .frd-chip.fake { background:rgba(244,63,94,.15); color:#fb7185; }
  .frd-chip.real { background:rgba(16,185,129,.15); color:#34d399; }

  /* ── Sentence highlights ── */
  .frd-sus { background:rgba(255,77,109,.12); border-bottom:1.5px solid rgba(255,77,109,.4); border-radius:2px; cursor:help; transition:background .2s; }
  .frd-sus:hover { background:rgba(255,77,109,.22); }

  /* ── Hidden fake ── */
  .frd-hidden { display:none !important; }
  .frd-hidden-stub {
    background:#fff8f8; border:1px dashed #fca5a5; border-radius:8px;
    padding:10px 14px; margin:8px 0; font-size:12px; color:#ef4444;
    display:flex; align-items:center; justify-content:space-between;
  }
  .frd-show-btn {
    font-size:11px; font-weight:600; padding:3px 10px; border-radius:99px;
    background:#fee2e2; border:1px solid #fca5a5; color:#ef4444; cursor:pointer;
  }

  /* ── Summary banner ── */
  #frd-banner {
    margin:12px 0; padding:14px 18px; border-radius:12px;
    background:#0f172a; border:1px solid #1e293b;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    display:flex; align-items:center; gap:16px; flex-wrap:wrap;
  }
  .frd-ban-icon { font-size:22px; flex-shrink:0; }
  .frd-ban-text { flex:1; }
  .frd-ban-title { font-size:13px; font-weight:700; color:#f1f5f9; margin-bottom:3px; }
  .frd-ban-sub   { font-size:11px; color:#64748b; }
  .frd-ban-pills { display:flex; gap:6px; flex-wrap:wrap; }
  .frd-ban-pill  { font-size:11px; font-weight:600; padding:4px 11px; border-radius:99px; }
  .frd-ban-pill.fake { background:rgba(244,63,94,.15); color:#fb7185; border:1px solid rgba(244,63,94,.2); }
  .frd-ban-pill.real { background:rgba(16,185,129,.15); color:#34d399; border:1px solid rgba(16,185,129,.2); }
  .frd-ban-pill.neutral { background:rgba(100,116,139,.15); color:#94a3b8; border:1px solid rgba(100,116,139,.2); }
  .frd-hide-toggle {
    font-size:11px; font-weight:600; padding:6px 13px; border-radius:99px; cursor:pointer; flex-shrink:0;
    background:rgba(244,63,94,.1); border:1px solid rgba(244,63,94,.25); color:#fb7185;
    transition:all .2s;
  }
  .frd-hide-toggle:hover { background:rgba(244,63,94,.2); }
  `;
  document.head.appendChild(s);
})();

/* ── Suspicious sentence patterns ────────────────────────────────────────── */
const SUS_PATTERNS = [
  /\b(best|greatest|amazing|incredible|perfect|love it|highly recommend|must buy|life changing|changed my life)\b/gi,
  /\b(fast shipping|quick delivery|arrived quickly|super fast)\b/gi,
  /\b(five stars|5 stars|would recommend|will buy again)\b/gi,
  /(!{2,})/g,
  /\b(everyone|everybody|anyone|anybody)\s+(should|must|needs to|has to)\s+(buy|get|try|have)\b/gi,
];

function highlightSuspicious(text) {
  let result = text;
  SUS_PATTERNS.forEach(pat => {
    result = result.replace(pat, m => `<span class="frd-sus" title="Suspicious phrase">$&</span>`);
  });
  return result;
}

/* ── Build hover card ─────────────────────────────────────────────────────── */
function buildCard(d) {
  const c = d.label===1?"fake":"real";
  const fp = Math.round(d.proba.fake*100), rp = 100-fp;
  const chips = d.keywords.slice(0,6).map(k=>`<span class="frd-chip ${c}">${k.word}</span>`).join("");
  return `<div class="frd-card">
    <div class="frd-cv ${c}">${d.label===1?"🚩":"✅"} ${d.verdict} REVIEW</div>
    <div class="frd-cr"><span class="frd-cl">Confidence</span><span class="frd-cval">${d.confidence}%</span></div>
    <div class="frd-bar"><div class="frd-bar-f ${c}" style="width:${d.confidence}%"></div></div>
    <div class="frd-cr"><span class="frd-cl">Fake probability</span><span class="frd-cval">${fp}%</span></div>
    <div class="frd-cr"><span class="frd-cl">Real probability</span><span class="frd-cval">${rp}%</span></div>
    ${chips?`<hr class="frd-sep"><div class="frd-kt">Signal words</div><div class="frd-chips">${chips}</div>`:""}
  </div>`;
}

/* ── Build credibility mini-bar ───────────────────────────────────────────── */
function buildCred(d) {
  const c = d.label===1?"fake":"real";
  const score = d.label===1
    ? Math.round(d.proba.real*100)   // credibility = real probability
    : Math.round(d.proba.real*100);
  return `<span class="frd-cred">
    <span class="frd-cred-track"><span class="frd-cred-fill ${c}" style="width:${score}%"></span></span>
    <span class="frd-cred-label ${c}">${score}% cred.</span>
  </span>`;
}

/* ── Process one review ───────────────────────────────────────────────────── */
async function processReview(el) {
  if (el.dataset.frdDone) return;
  el.dataset.frdDone = "1";

  const textNode = el.querySelector('[data-hook="review-body"] span')
                || el.querySelector('.review-text-content span')
                || el.querySelector('.reviewText span');
  if (!textNode) return;

  const text = textNode.innerText.trim();
  if (text.length < 15) return;

  const anchor = el.querySelector('[data-hook="review-body"]')
               || el.querySelector('.review-text-content')
               || textNode.parentElement;
  if (!anchor) return;

  /* Loading badge */
  const wrap  = document.createElement("div");
  wrap.className = "frd-wrap";
  const badge = document.createElement("div");
  badge.className = "frd-badge loading";
  badge.innerHTML = `<span class="frd-dot"></span><span>Checking…</span>`;
  wrap.appendChild(badge);
  anchor.after(wrap);

  try {
    const r = await fetch(API,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({text}),signal:AbortSignal.timeout(8000)
    });
    if (!r.ok) throw new Error("api_error");
    const d   = await r.json();
    const cls = d.label===1?"fake":"real";
    const icon = d.label===1?"🚩":"✅";

    /* Update badge */
    badge.className = `frd-badge ${cls}`;
    badge.innerHTML = `<span class="frd-dot"></span><span>${icon} ${d.verdict} · ${d.confidence}%</span>`;

    /* Add hover card + credibility bar */
    wrap.insertAdjacentHTML("beforeend", buildCard(d));
    wrap.insertAdjacentHTML("beforeend", buildCred(d));

    /* Highlight suspicious sentences in fake reviews */
    if (d.label===1 && textNode) {
      textNode.innerHTML = highlightSuspicious(textNode.innerHTML || textNode.innerText);
    }

    /* Handle hide-fakes toggle */
    processed.push({el, d, badge, wrap, anchor});
    if (hideFakes && d.label===1) hideReview(el, wrap);

    /* Save to storage */
    chrome.storage.local.get(["frd_h"],({frd_h})=>{
      const h = frd_h||[];
      h.unshift({verdict:d.verdict,label:d.label,confidence:d.confidence,
        snippet:text.substring(0,65)+(text.length>65?"…":""),ts:Date.now()});
      chrome.storage.local.set({frd_h:h.slice(0,100)});
    });

    /* Update banner after all visible reviews processed */
    updateBanner();

  } catch {
    badge.className = "frd-badge error";
    badge.innerHTML = `<span class="frd-dot"></span><span>Offline — run app.py</span>`;
  }
}

/* ── Show / hide a fake review ────────────────────────────────────────────── */
function hideReview(el, wrap) {
  el.classList.add("frd-hidden");
  if (!el.nextElementSibling?.classList.contains("frd-hidden-stub")) {
    const stub = document.createElement("div");
    stub.className = "frd-hidden-stub";
    stub.innerHTML = `<span>🚩 Fake review hidden by FRD</span>
      <button class="frd-show-btn" onclick="this.parentElement.remove();this.closest('[data-hook=review]')?.classList.remove('frd-hidden')">Show anyway</button>`;
    el.after(stub);
  }
}

function showReview(el) {
  el.classList.remove("frd-hidden");
  el.nextElementSibling?.classList.contains("frd-hidden-stub") && el.nextElementSibling.remove();
}

/* ── Summary banner ───────────────────────────────────────────────────────── */
function updateBanner() {
  const done  = processed.filter(p=>p.d);
  if (!done.length) return;

  const fakeC = done.filter(p=>p.d.label===1).length;
  const realC = done.length - fakeC;
  const rate  = Math.round(fakeC/done.length*100);
  const warn  = rate >= 50 ? "⚠️ High fake rate on this page!" : rate >= 25 ? "Moderate fake activity detected." : "Most reviews look genuine.";

  let banner = document.getElementById("frd-banner");
  if (!banner) {
    const section = document.querySelector('[data-hook="reviews-medley-footer"], #cm_cr-review_list, .reviews-content');
    if (!section) return;
    banner = document.createElement("div");
    banner.id = "frd-banner";
    section.before(banner);
  }

  banner.innerHTML = `
    <div class="frd-ban-icon">${rate>=50?"⚠️":"🔍"}</div>
    <div class="frd-ban-text">
      <div class="frd-ban-title">Fake Review Detector — ${warn}</div>
      <div class="frd-ban-sub">Analyzed ${done.length} review${done.length!==1?"s":""} on this page</div>
    </div>
    <div class="frd-ban-pills">
      <span class="frd-ban-pill fake">🚩 ${fakeC} Fake</span>
      <span class="frd-ban-pill real">✅ ${realC} Real</span>
      <span class="frd-ban-pill neutral">${rate}% fake rate</span>
    </div>
    <button class="frd-hide-toggle" id="frd-hide-btn" onclick="toggleHide()">
      ${hideFakes?"👁 Show fakes":"🚫 Hide fakes"}
    </button>`;
}

/* ── Toggle hide fakes ────────────────────────────────────────────────────── */
function toggleHide() {
  hideFakes = !hideFakes;
  processed.forEach(({el, d, wrap})=>{
    if (d.label===1) hideFakes ? hideReview(el, wrap) : showReview(el);
  });
  updateBanner();
}

/* ── Scan ─────────────────────────────────────────────────────────────────── */
function scan() {
  document.querySelectorAll('[data-hook="review"], .review, .a-section.review')
    .forEach(processReview);
}

scan();
new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
