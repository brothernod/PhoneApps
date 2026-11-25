(() => {
  "use strict";

  // ---------- Constants ----------
  const PEOPLE = {
    jonathan: { name: "Jonathan", cls: "j", heart: "heartJ", note: "noteJ" },
    rachel: { name: "Rachel", cls: "r", heart: "heartR", note: "noteR" },
  };
  const OTHER = { jonathan: "rachel", rachel: "jonathan" };
  const TIERS = [
    { key: "must", name: "Must", band: [67, 100] },
    { key: "want", name: "Want", band: [34, 66] },
    { key: "maybe", name: "Maybe", band: [0, 33] },
  ];
  const STORE = "bf.config.v1";
  const POLL_MS = 8000;

  const ICON = {
    grip: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M4 7.25h16v1.5H4zm0 4h16v1.5H4zm0 4h16v1.5H4z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 20.6 10.6 19.3C5.6 14.8 2.3 11.8 2.3 8.1 2.3 5.1 4.6 2.8 7.6 2.8c1.7 0 3.3.8 4.4 2 1.1-1.2 2.7-2 4.4-2 3 0 5.3 2.3 5.3 5.3 0 3.7-3.3 6.7-8.3 11.2L12 20.6Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z"/></svg>',
  };

  // ---------- State ----------
  const S = {
    api: "", key: "", me: "", view: "", tab: "list",
    data: null, rev: 0, dragging: false, pendingRender: false,
    sheets: [], wired: false, skipSeed: false, pollTimer: null, deals: null,
  };

  // ---------- Small helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "html") el.innerHTML = v;
        else if (k === "value") el.value = v;
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? "" : v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : String(kid));
    }
    return el;
  }

  const num = (v) => (v === "" || v == null || !Number.isFinite(+v) ? null : +v);
  const money = (n, cents = false) => {
    if (n == null) return "";
    if (cents && Math.round(n * 100) % 100 !== 0) return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return "$" + Math.round(n).toLocaleString("en-US");
  };
  const moneyRange = (r, cents = false) => {
    if (!r) return "No price yet";
    const [lo, hi] = r;
    return Math.abs(hi - lo) < 0.5 ? money(lo, cents) : `${money(lo, cents)}–${money(hi, cents)}`;
  };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID().slice(0, 12) : Math.random().toString(36).slice(2, 14));
  const hostOf = (u) => {
    try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
  };
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const niceDate = (s) => {
    if (!s) return "";
    const d = new Date(s + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  let toastTimer;
  function toast(msg, ms = 2400) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), ms);
  }

  // ---------- Config and links ----------
  function loadCfg() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
  }
  function saveCfg() {
    try { localStorage.setItem(STORE, JSON.stringify({ api: S.api, key: S.key, me: S.me, view: S.view })); } catch { /* private mode */ }
  }
  function parseLink(str) {
    if (!str) return null;
    const i = str.indexOf("#");
    const params = new URLSearchParams(i >= 0 ? str.slice(i + 1) : str);
    const api = params.get("api");
    const key = params.get("k");
    if (!api || !key) return null;
    const me = params.get("me");
    return { api: api.replace(/\/+$/, ""), key, me: PEOPLE[me] ? me : "" };
  }
  function linkFor(person) {
    const base = location.href.split("#")[0];
    return `${base}#${new URLSearchParams({ api: S.api, k: S.key, me: person })}`;
  }

  // ---------- API ----------
  async function api(path, opts = {}) {
    const headers = { Authorization: "Bearer " + S.key, ...(opts.headers || {}) };
    if (typeof opts.body === "string") headers["Content-Type"] = "application/json";
    let res;
    try {
      res = await fetch(S.api + path, { ...opts, headers });
    } catch {
      throw new Error("Can't reach the list. Check your connection.");
    }
    let body = null;
    try { body = await res.json(); } catch { /* non-JSON */ }
    if (!res.ok) throw new Error(body?.error || `The list server answered ${res.status}.`);
    return body;
  }

  function setOnline(ok) {
    $("#sync-dot")?.classList.toggle("off", !ok);
  }

  async function refresh() {
    const d = await api("/api/state");
    S.data = d;
    S.rev = d.rev;
    setOnline(true);
    render();
    redrawSheets(false);
  }

  function noteRev(rev) {
    if (rev === S.rev + 1) S.rev = rev;
    else refresh().catch(() => {});
  }

  async function poll() {
    if (document.hidden || S.dragging || !S.api || !S.data) return;
    try {
      const { rev } = await api("/api/rev");
      setOnline(true);
      if (rev !== S.rev) await refresh();
    } catch {
      setOnline(false);
    }
  }

  // ---------- Price check results ----------
  // A scheduled job writes data/deals.json next to this page twice a day.
  async function loadDeals() {
    try {
      const res = await fetch(`data/deals.json?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      if (d && d.items) {
        S.deals = d;
        render();
        redrawSheets(false);
      }
    } catch {
      /* no results yet */
    }
  }
  const dealFor = (it) => S.deals?.items?.[it.id] || null;
  const checkedAt = () => {
    const t = S.deals?.checked ? new Date(S.deals.checked) : null;
    return t && !isNaN(t) ? t.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }) : "";
  };
  // True when the best price seen beats the low end of the ballpark (or the picked option's price).
  function dealIsGood(it, deal) {
    const u = unitRange(it);
    const best = num(deal?.best?.price);
    return best != null && u != null && best < u[0] - 0.5;
  }

  // ---------- Data access ----------
  const item = (id) => S.data.items.find((it) => it.id === id);
  const activeItems = () => S.data.items.filter((it) => it.status !== "bought" && it.status !== "passed");
  const boughtItems = () => S.data.items.filter((it) => it.status === "bought");

  async function patchItem(id, patch, { redraw = false } = {}) {
    const it = item(id);
    if (it) Object.assign(it, patch);
    render();
    if (redraw) redrawSheets(true);
    try {
      const r = await api(`/api/items/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ patch, by: S.me }) });
      const cur = item(id);
      if (cur) Object.assign(cur, r.item);
      noteRev(r.rev);
    } catch (e) {
      toast(e.message);
      refresh().catch(() => {});
    }
  }

  async function createItem(fields) {
    const it = {
      id: uid(), title: "Untitled", why: "", qty: 1, low: null, high: null, regular: null,
      status: "considering", chosen: null, cands: [], heartJ: null, heartR: null,
      noteJ: "", noteR: "", purchase: null, priceNote: "", ...fields,
    };
    S.data.items.push(it);
    render();
    try {
      const r = await api(`/api/items/${it.id}`, { method: "PUT", body: JSON.stringify({ patch: it, by: S.me }) });
      Object.assign(it, r.item);
      noteRev(r.rev);
    } catch (e) {
      toast(e.message);
      refresh().catch(() => {});
    }
    return it;
  }

  async function deleteItem(id) {
    S.data.items = S.data.items.filter((it) => it.id !== id);
    render();
    try {
      const r = await api(`/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
      noteRev(r.rev);
    } catch (e) {
      toast(e.message);
      refresh().catch(() => {});
    }
  }

  async function saveRanks(tiers) {
    S.data.ranks[S.me] = tiers;
    render();
    try {
      const r = await api(`/api/ranks/${S.me}`, { method: "PUT", body: JSON.stringify({ tiers }) });
      noteRev(r.rev);
    } catch (e) {
      toast(e.message);
      refresh().catch(() => {});
    }
  }

  async function saveMeta(patch) {
    Object.assign(S.data.meta, patch);
    render();
    try {
      const r = await api("/api/meta", { method: "PUT", body: JSON.stringify(patch) });
      noteRev(r.rev);
    } catch (e) {
      toast(e.message);
    }
  }

  // ---------- Money math ----------
  // Price per unit: the picked option's price if there is one, otherwise the ballpark,
  // otherwise the spread of the options' prices.
  function unitRange(it) {
    const cands = it.cands || [];
    const chosen = cands.find((c) => c.id === it.chosen);
    if (chosen && num(chosen.price) != null) return [num(chosen.price), num(chosen.price)];
    const prices = cands.map((c) => num(c.price)).filter((p) => p != null);
    let lo = num(it.low);
    let hi = num(it.high);
    if (lo == null && hi == null && prices.length) {
      lo = Math.min(...prices);
      hi = Math.max(...prices);
    }
    if (lo == null) lo = hi;
    if (hi == null) hi = lo;
    return lo == null ? null : [Math.min(lo, hi), Math.max(lo, hi)];
  }
  const qtyOf = (it) => Math.max(1, Math.round(num(it.qty) || 1));
  function totalRange(it) {
    const u = unitRange(it);
    return u ? [u[0] * qtyOf(it), u[1] * qtyOf(it)] : null;
  }
  function sumRanges(items) {
    let lo = 0, hi = 0, missing = 0;
    for (const it of items) {
      const r = totalRange(it);
      if (r) { lo += r[0]; hi += r[1]; } else missing++;
    }
    return { lo, hi, missing, count: items.length };
  }
  // A purchase stores the price each and how many. Older purchases only stored the total
  // ("paid") for the item's quantity at the time, so derive the price each from that.
  const round2 = (n) => (n == null ? null : Math.round(n * 100) / 100);
  function purchaseOf(it) {
    const p = it.purchase || {};
    const qty = Math.max(1, Math.round(num(p.qty) || qtyOf(it)));
    const gift = !!p.gift;
    let each = num(p.each);
    if (each == null && num(p.paid) != null) each = round2(num(p.paid) / qty);
    let regularEach = num(p.regularEach);
    if (regularEach == null && num(p.regular) != null) regularEach = round2(num(p.regular) / qty);
    const paid = gift || each == null ? null : num(p.each) != null ? round2(each * qty) : num(p.paid);
    const regular = gift || regularEach == null ? null : round2(regularEach * qty);
    return { cand: p.cand || null, qty, each: gift ? null : each, paid, regularEach, regular, gift, store: p.store || "", from: p.from || "", date: p.date || "" };
  }
  const isGift = (it) => !!it.purchase?.gift;
  const paidItems = () => boughtItems().filter((it) => !isGift(it));
  const giftItems = () => boughtItems().filter(isGift);
  const savedOn = (p) => (p.regular != null && p.paid != null && p.regular > p.paid ? round2(p.regular - p.paid) : 0);
  const spentTotal = () => paidItems().reduce((s, it) => s + (purchaseOf(it).paid || 0), 0);
  const savedTotal = () => paidItems().reduce((s, it) => s + savedOn(purchaseOf(it)), 0);
  const eachLine = (p) => (p.qty > 1 && p.each != null ? `${p.qty} × ${money(p.each, true)} each` : null);

  // ---------- Rankings ----------
  function tiersFor(person) {
    const raw = S.data.ranks?.[person] || {};
    const active = new Map(activeItems().map((it) => [it.id, it]));
    const seen = new Set();
    const out = {};
    for (const t of TIERS) {
      out[t.key] = [];
      for (const id of raw[t.key] || []) {
        if (active.has(id) && !seen.has(id)) {
          seen.add(id);
          out[t.key].push(active.get(id));
        }
      }
    }
    out.unsorted = [...active.values()].filter((it) => !seen.has(it.id));
    return out;
  }

  // Each tier is a band of scores; position inside the tier sets where in the band an idea lands.
  function scoresFor(person) {
    const t = tiersFor(person);
    const map = new Map();
    for (const tier of TIERS) {
      const list = t[tier.key];
      const [lo, hi] = tier.band;
      list.forEach((it, i) => {
        const score = list.length <= 1 ? hi : hi - (i / (list.length - 1)) * (hi - lo);
        map.set(it.id, { tier: tier.key, score });
      });
    }
    return map;
  }

  function together() {
    const J = scoresFor("jonathan");
    const R = scoresFor("rachel");
    const rows = activeItems().map((it) => {
      const a = J.get(it.id);
      const b = R.get(it.id);
      const score = a || b ? ((a ? a.score : 50) + (b ? b.score : 50)) / 2 : null;
      const far = a && b && ((a.tier === "must" && b.tier === "maybe") || (a.tier === "maybe" && b.tier === "must"));
      return { it, a, b, score, split: !!far };
    });
    const scored = rows
      .filter((r) => r.score != null)
      .sort((x, y) => y.score - x.score || x.it.title.localeCompare(y.it.title));
    const groups = { must: [], want: [], maybe: [] };
    for (const r of scored) groups[r.score >= 66.5 ? "must" : r.score >= 33.5 ? "want" : "maybe"].push(r);
    return { groups, unsorted: rows.filter((r) => r.score == null) };
  }

  // ---------- Rendering: chrome ----------
  function render() {
    if (!S.data) return;
    if (S.dragging) {
      S.pendingRender = true;
      return;
    }
    renderTag();
    renderSeg();
    renderBar();
    const main = $("#main");
    const y = window.scrollY;
    main.replaceChildren();
    if (!S.data.items.length && !S.skipSeed) {
      main.append(renderEmpty());
    } else if (S.tab === "bought") {
      main.append(...renderBought());
    } else {
      main.append(...renderList());
      attachSortables();
    }
    window.scrollTo(0, y);
  }

  function renderTag() {
    const act = activeItems();
    const s = sumRanges(act);
    const spent = spentTotal();
    const saved = savedTotal();
    const budget = num(S.data.meta?.budget);
    const tag = $("#tag");

    const amount = h("span", { class: "tag-amount" });
    if (!act.length) amount.textContent = money(0);
    else if (Math.abs(s.hi - s.lo) < 0.5) amount.textContent = money(s.lo);
    else amount.append(money(s.lo), h("span", { class: "dash" }, "–"), money(s.hi));

    let caption = act.length === 1 ? "to buy the 1 idea left" : `to buy the ${act.length} ideas left`;
    if (s.missing) caption += `, ${s.missing} without a price`;

    const stats = h(
      "div",
      { class: "tag-stats" },
      h("div", null, h("b", null, money(spent)), h("span", null, "spent")),
      h("div", null, h("b", null, String(boughtItems().length)), h("span", null, "bought")),
      saved > 0 ? h("div", null, h("b", null, money(saved)), h("span", null, "saved")) : null
    );

    const parts = [amount, h("span", { class: "tag-caption" }, caption), stats];

    if (budget) {
      const mid = (s.lo + s.hi) / 2;
      // Scale to whichever is bigger, the budget or the projected total, so the red part is the overage.
      const projected = spent + mid;
      const scale = Math.max(budget, projected) || 1;
      const over = projected - budget;
      const pct = (v) => `${Math.max(0, (v / scale) * 100).toFixed(2)}%`;
      const bar = h(
        "div",
        { class: "budget-bar" },
        h("i", { style: `width:${pct(Math.min(spent, budget))}` }),
        h("i", { class: "est", style: `width:${pct(Math.max(0, Math.min(projected, budget) - spent))}` }),
        over > 0 ? h("i", { class: "over", style: `width:${pct(over)}` }) : null
      );
      parts.push(
        h(
          "div",
          { class: "budget" },
          bar,
          h(
            "div",
            { class: "budget-line" },
            h("span", null, `Budget ${money(budget)}`),
            h("span", null, over > 0 ? `About ${money(over)} over budget` : `${money(budget - spent)} left to spend`)
          )
        )
      );
    }
    tag.replaceChildren(...parts);
  }

  function renderSeg() {
    const seg = $("#seg");
    seg.hidden = S.tab !== "list" || !S.data.items.length;
    const opts = [
      { key: "jonathan", label: PEOPLE.jonathan.name, dot: "j" },
      { key: "rachel", label: PEOPLE.rachel.name, dot: "r" },
      { key: "together", label: "Together", dot: "both" },
    ];
    seg.replaceChildren(
      h(
        "div",
        { class: "seg-inner" },
        opts.map((o) =>
          h(
            "button",
            {
              type: "button",
              "aria-pressed": String(S.view === o.key),
              onclick: () => {
                S.view = o.key;
                saveCfg();
                render();
                window.scrollTo(0, 0);
              },
            },
            h("span", { class: `dot ${o.dot}` }),
            o.label
          )
        )
      )
    );
  }

  function renderBar() {
    for (const b of document.querySelectorAll(".bar-tab")) {
      if (b.dataset.tab === S.tab) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    }
  }

  function thumb(it) {
    const cands = it.cands || [];
    const pick = cands.find((c) => c.id === it.chosen && c.img) || cands.find((c) => c.img);
    const letter = (it.title || "?").trim().charAt(0).toUpperCase();
    const box = h("div", { class: "thumb" });
    if (pick) {
      const img = h("img", { src: pick.img, alt: "", loading: "lazy", referrerpolicy: "no-referrer" });
      img.addEventListener("error", () => box.replaceChildren(letter));
      box.append(img);
    } else box.append(letter);
    return box;
  }

  function row(it, { grip = false, votes = null, sub = null } = {}) {
    const cands = it.cands || [];
    const chosen = cands.find((c) => c.id === it.chosen);
    const r = totalRange(it);
    const subParts = sub || [
      h("span", { class: "price" }, r ? moneyRange(r) : "No price yet"),
      qtyOf(it) > 1 ? h("span", { class: "qty" }, `×${qtyOf(it)}`) : null,
      chosen ? h("span", { class: "chip picked" }, chosen.label) : null,
      !chosen && cands.length === 0 ? h("span", { class: "chip" }, "Still choosing") : null,
      !chosen && cands.length > 1 ? h("span", { class: "chip" }, `${cands.length} options`) : null,
      votes?.split ? h("span", { class: "chip split" }, "You disagree") : null,
      (() => {
        const d = dealFor(it);
        if (!d?.best || num(d.best.price) == null || it.status === "bought") return null;
        return h("span", { class: "chip deal" + (dealIsGood(it, d) ? " good" : "") }, `Best seen ${money(num(d.best.price), true)}`);
      })(),
    ];
    let right = h("span");
    if (grip) right = h("button", { class: "grip", type: "button", "aria-label": `Drag ${it.title}`, html: ICON.grip });
    else if (votes) right = voteEl(votes);
    return h(
      "li",
      {
        class: "row" + (it.status === "passed" ? " is-done" : ""),
        "data-id": it.id,
        onclick: (e) => {
          if (!e.target.closest(".grip")) openItem(it.id);
        },
      },
      thumb(it),
      h("div", { class: "row-main" }, h("div", { class: "row-title" }, it.title || "Untitled"), h("div", { class: "row-sub" }, subParts)),
      right
    );
  }

  function voteEl({ a, b }) {
    const tierName = (x) => (x ? TIERS.find((t) => t.key === x.tier).name : "Not sorted");
    const line = (who, x) =>
      h("span", { class: "vote" + (x ? "" : " none") }, h("span", { class: `dot ${PEOPLE[who].cls}` }), tierName(x));
    return h("div", { class: "votes" }, line("jonathan", a), line("rachel", b));
  }

  function tierHead(name, count, sum, running, runningLabel) {
    return h(
      "div",
      { class: "tier-head" },
      h("div", { class: "tier-name" }, name, h("span", { class: "tier-count" }, String(count))),
      h("div", { class: "tier-sum" }, count ? moneyRange([sum.lo, sum.hi]) : "$0"),
      running ? h("div", { class: "tier-running" }, `${runningLabel} `, h("b", null, moneyRange([running.lo, running.hi]))) : null
    );
  }

  // ---------- Rendering: list views ----------
  function renderList() {
    const out = S.view === "together" ? renderTogether() : renderPerson(S.view);
    const passed = S.data.items.filter((it) => it.status === "passed");
    if (passed.length) {
      out.push(
        h(
          "details",
          { class: "passed" },
          h("summary", null, `Passed on (${passed.length})`),
          h("ul", { class: "rows" }, passed.map((it) => row(it)))
        )
      );
    }
    return out;
  }

  const RUNNING_LABEL = { want: "Must + Want", maybe: "All three tiers" };

  function renderPerson(person) {
    const mine = person === S.me;
    const t = tiersFor(person);
    const out = [];
    out.push(
      h(
        "p",
        { class: "view-note" },
        mine ? "Drag the handle to sort ideas into tiers and put them in order." : `${PEOPLE[person].name}'s order. Only ${PEOPLE[person].name} can change it.`
      )
    );
    const running = { lo: 0, hi: 0 };
    for (const tier of TIERS) {
      const items = t[tier.key];
      const sum = sumRanges(items);
      running.lo += sum.lo;
      running.hi += sum.hi;
      out.push(
        h(
          "section",
          { class: "tier" },
          tierHead(tier.name, items.length, sum, tier.key === "must" ? null : { ...running }, RUNNING_LABEL[tier.key]),
          h(
            "ul",
            { class: "rows", "data-tier": tier.key, "data-empty": mine ? "Drag ideas here" : "Nothing here" },
            items.map((it) => row(it, { grip: mine }))
          )
        )
      );
    }
    if (t.unsorted.length || mine) {
      const sum = sumRanges(t.unsorted);
      out.push(
        h(
          "section",
          { class: "tier" },
          tierHead("Not sorted yet", t.unsorted.length, sum, null),
          h(
            "ul",
            { class: "rows", "data-tier": "unsorted", "data-empty": "Everything is sorted" },
            t.unsorted.map((it) => row(it, { grip: mine }))
          )
        )
      );
    }
    return out;
  }

  function renderTogether() {
    const { groups, unsorted } = together();
    const budget = num(S.data.meta?.budget);
    const budgetLeft = budget ? budget - spentTotal() : null;
    let cumulative = 0;
    let cutPlaced = false;
    const out = [h("p", { class: "view-note" }, "Your two rankings averaged. Ideas only one of you has sorted count as middle-of-the-road for the other.")];
    const running = { lo: 0, hi: 0 };
    for (const tier of TIERS) {
      const rows = groups[tier.key];
      const sum = sumRanges(rows.map((r) => r.it));
      running.lo += sum.lo;
      running.hi += sum.hi;
      const ul = h("ul", { class: "rows", "data-empty": "Nothing here yet" });
      for (const r of rows) {
        const tr = totalRange(r.it);
        cumulative += tr ? (tr[0] + tr[1]) / 2 : 0;
        if (budgetLeft != null && !cutPlaced && cumulative > budgetLeft) {
          ul.append(h("li", { class: "budget-cut" }, "Past your budget from here"));
          cutPlaced = true;
        }
        ul.append(row(r.it, { votes: r }));
      }
      out.push(
        h("section", { class: "tier" }, tierHead(tier.name, rows.length, sum, tier.key === "must" ? null : { ...running }, RUNNING_LABEL[tier.key]), ul)
      );
    }
    if (unsorted.length) {
      out.push(
        h(
          "section",
          { class: "tier" },
          tierHead("Neither of you has sorted", unsorted.length, sumRanges(unsorted.map((r) => r.it)), null),
          h("ul", { class: "rows" }, unsorted.map((r) => row(r.it, { votes: r })))
        )
      );
    }
    return out;
  }

  function attachSortables() {
    if (S.view !== S.me || typeof Sortable === "undefined") return;
    for (const ul of document.querySelectorAll("#main ul.rows[data-tier]")) {
      Sortable.create(ul, {
        group: "tiers",
        handle: ".grip",
        animation: 160,
        forceFallback: true,
        fallbackTolerance: 3,
        scrollSensitivity: 80,
        scrollSpeed: 14,
        ghostClass: "sortable-ghost",
        chosenClass: "sortable-chosen",
        dragClass: "sortable-drag",
        onStart() {
          S.dragging = true;
          navigator.vibrate?.(8);
        },
        onEnd() {
          S.dragging = false;
          const tiers = {};
          for (const t of TIERS) {
            const list = document.querySelector(`#main ul.rows[data-tier="${t.key}"]`);
            tiers[t.key] = list ? [...list.children].map((li) => li.dataset.id).filter(Boolean) : [];
          }
          S.pendingRender = false;
          saveRanks(tiers);
        },
      });
    }
  }

  function renderEmpty() {
    const seedCount = (window.BF_SEED || []).length;
    return h(
      "div",
      { class: "empty" },
      h("h2", null, "Load your list"),
      h("p", null, `Your ${seedCount} ideas from Notes are ready to load, with ballpark prices and product links filled in.`),
      h(
        "div",
        { class: "btn-row" },
        h("button", { class: "btn money", type: "button", onclick: (e) => seedList(e.currentTarget) }, `Load the ${seedCount} ideas`),
        h(
          "button",
          {
            class: "btn",
            type: "button",
            onclick: () => {
              S.skipSeed = true;
              render();
              openAdd();
            },
          },
          "Start empty"
        )
      )
    );
  }

  function renderBought() {
    const bought = boughtItems().sort((a, b) => String(b.purchase?.date || "").localeCompare(String(a.purchase?.date || "")));
    const spent = spentTotal();
    const saved = savedTotal();
    const paid = paidItems();
    const gifts = giftItems();
    const ballpark = sumRanges(paid);
    if (!bought.length) {
      return [
        h(
          "div",
          { class: "empty" },
          h("h2", null, "Nothing bought yet"),
          h("p", null, "When you buy something, open the idea and tap Mark bought. What you paid shows up here.")
        ),
      ];
    }
    return [
      h(
        "div",
        { class: "receipt" },
        h(
          "div",
          { class: "receipt-total" },
          h("span", { class: "lbl" }, `Spent on ${paid.length} ${paid.length === 1 ? "thing" : "things"}`),
          h("span", { class: "big" }, money(spent, true)),
          paid.length ? h("span", { class: "lbl" }, "Your ballpark for these") : null,
          paid.length ? h("span", null, moneyRange([ballpark.lo, ballpark.hi])) : null,
          saved > 0 ? h("span", { class: "lbl" }, "Saved off retail prices") : null,
          saved > 0 ? h("span", { class: "save-good" }, money(saved, true)) : null,
          gifts.length ? h("span", { class: "lbl" }, "Gifts, not counted in spending") : null,
          gifts.length ? h("span", null, `${gifts.length} ${gifts.length === 1 ? "gift" : "gifts"}`) : null
        )
      ),
      h("h2", { class: "section-title" }, "Purchases"),
      h(
        "ul",
        { class: "rows" },
        bought.map((it) => {
          const p = purchaseOf(it);
          const cand = (it.cands || []).find((c) => c.id === p.cand);
          return row(it, {
            sub: p.gift
              ? [
                  h("span", { class: "chip gift" }, "Gift"),
                  p.qty > 1 ? h("span", { class: "qty" }, `×${p.qty}`) : null,
                  p.from ? h("span", null, `from ${p.from}`) : null,
                  cand ? h("span", null, cand.label) : null,
                  p.date ? h("span", null, niceDate(p.date)) : null,
                ]
              : [
                  h("span", { class: "price" }, money(p.paid, true) || "No amount"),
                  eachLine(p) ? h("span", { class: "qty" }, eachLine(p)) : null,
                  savedOn(p) > 0 ? h("span", { class: "chip picked" }, `Saved ${money(savedOn(p), true)}`) : null,
                  cand ? h("span", null, cand.label) : null,
                  p.store ? h("span", null, p.store) : null,
                  p.date ? h("span", null, niceDate(p.date)) : null,
                ],
          });
        })
      ),
    ];
  }

  // ---------- Sheets ----------
  function pushSheet(spec) {
    const wrap = h("div", { class: "sheet-wrap" });
    const scrim = h("div", { class: "sheet-scrim", onclick: () => popSheet() });
    const sheet = h("div", { class: "sheet" + (spec.full ? " full" : ""), role: "dialog", "aria-modal": "true" });
    const head = h("div", { class: "sheet-head" });
    const body = h("div", { class: "sheet-body" });
    sheet.append(h("div", { class: "grabber" }), head, body);
    wrap.append(scrim, sheet);
    $("#sheets").append(wrap);
    const entry = { ...spec, wrap, head, body };
    entry.draw = () => {
      const scrollTop = body.scrollTop;
      const opts = body.querySelector(".options");
      const optsLeft = opts ? opts.scrollLeft : 0;
      head.replaceChildren();
      body.replaceChildren();
      spec.render(body, head, entry);
      body.scrollTop = scrollTop;
      const opts2 = body.querySelector(".options");
      if (opts2) opts2.scrollLeft = optsLeft;
    };
    S.sheets.push(entry);
    entry.draw();
    document.documentElement.style.overflow = "hidden";
    return entry;
  }

  function popSheet() {
    const e = S.sheets.pop();
    if (e) {
      // Commit a field that's still focused before the sheet goes away.
      if (e.wrap.contains(document.activeElement)) document.activeElement.blur();
      e.wrap.remove();
      e.onClose?.();
    }
    if (!S.sheets.length) document.documentElement.style.overflow = "";
  }

  function redrawSheets(force) {
    for (const e of S.sheets) {
      if (!e.live) continue;
      if (!force && e.wrap.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) continue;
      e.draw();
    }
  }

  function sheetHead(head, { left, title, right }) {
    head.append(
      left ? h("button", { class: "text-btn left", type: "button", onclick: left[1] }, left[0]) : h("span"),
      h("h2", null, title || ""),
      right ? h("button", { class: "text-btn strong right", type: "button", onclick: right[1] }, right[0]) : h("span")
    );
  }

  const field = (label, control, hint) =>
    h("label", { class: "field" }, h("span", null, label), control, hint ? h("p", { class: "hint" }, hint) : null);

  function moneyInput(value, onChange, placeholder = "") {
    return h(
      "div",
      { class: "money-input" },
      h("input", {
        class: "input",
        type: "text",
        inputmode: "decimal",
        value: value == null ? "" : String(value),
        placeholder,
        onchange: (e) => onChange(num(e.target.value.replace(/[$,\s]/g, ""))),
      })
    );
  }

  function qtyStepper(value, onChange) {
    const out = h("output", null, String(value));
    const set = (v) => {
      const n = Math.max(1, Math.min(99, v));
      out.textContent = String(n);
      onChange(n);
    };
    return h(
      "div",
      { class: "qty-step" },
      h("button", { type: "button", "aria-label": "Fewer", onclick: () => set(+out.textContent - 1) }, "−"),
      out,
      h("button", { type: "button", "aria-label": "More", onclick: () => set(+out.textContent + 1) }, "+")
    );
  }

  function autoGrow(ta) {
    const fit = () => {
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    };
    ta.addEventListener("input", fit);
    requestAnimationFrame(fit);
    return ta;
  }

  // ---------- Item detail ----------
  function openItem(id) {
    pushSheet({ full: true, live: true, render: (body, head) => renderItemSheet(id, body, head) });
  }

  function renderItemSheet(id, body, head) {
    const it = item(id);
    if (!it) {
      setTimeout(popSheet);
      return;
    }
    sheetHead(head, { left: ["Done", popSheet], title: "" });

    const tr = totalRange(it);
    const statusWord = { considering: "Considering", decided: "Decided", bought: "Bought", passed: "Passed on" }[it.status] || "";
    body.append(
      autoGrow(
        h("textarea", {
          class: "title-input",
          rows: "1",
          value: it.title || "",
          "aria-label": "Idea name",
          enterkeyhint: "done",
          onkeydown: (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.target.blur();
            }
          },
          onchange: (e) => patchItem(id, { title: e.target.value.replace(/\s+/g, " ").trim() || "Untitled" }),
        })
      ),
      h(
        "div",
        { class: "detail-total" },
        h("b", null, tr ? moneyRange(tr) : "No price yet"),
        qtyOf(it) > 1 ? h("span", null, `for ${qtyOf(it)}`) : null,
        h("span", null, statusWord)
      )
    );

    if (it.status === "bought") body.append(boughtCard(it));
    body.append(optionsCarousel(it));
    const dealBlock = priceCheckBlock(it);
    if (dealBlock) body.append(dealBlock);

    body.append(
      h(
        "div",
        { class: "block" },
        h("h3", null, "Why we want it"),
        h("textarea", {
          class: "textarea why-input",
          rows: "3",
          placeholder: "Make the pitch. What does it fix or make better?",
          value: it.why || "",
          onchange: (e) => patchItem(id, { why: e.target.value }),
        })
      )
    );

    body.append(priceBlock(it));
    body.append(takesBlock(it));
    body.append(actionsBlock(it));
  }

  function boughtCard(it) {
    const p = purchaseOf(it);
    const cand = (it.cands || []).find((c) => c.id === p.cand);
    const edit = h("button", { class: "text-btn bought-edit", type: "button", onclick: () => markBought(it.id) }, "Edit");
    if (p.gift) {
      return h(
        "div",
        { class: "bought-card" },
        edit,
        h("div", null, h("b", null, "Gift"), p.qty > 1 ? ` ×${p.qty}` : null, p.from ? ` from ${p.from}` : null),
        h("div", null, [cand?.label, niceDate(p.date)].filter(Boolean).join(", ")),
        h("div", null, "Not counted in what you spent.")
      );
    }
    return h(
      "div",
      { class: "bought-card" },
      edit,
      h("div", null, h("b", null, money(p.paid, true) || "No amount"), " paid"),
      eachLine(p) ? h("div", null, eachLine(p)) : null,
      h("div", null, [cand?.label, p.store, niceDate(p.date)].filter(Boolean).join(", ")),
      savedOn(p) > 0 ? h("div", null, `Saved ${money(savedOn(p), true)} off retail price`) : null
    );
  }

  function optionsCarousel(it) {
    const cands = it.cands || [];
    if (!cands.length) {
      return h(
        "div",
        { class: "concept" },
        h("p", null, "No specific products yet. Add the ones you're comparing as you find them, and each of you can heart a favorite."),
        h("button", { class: "btn small", type: "button", onclick: () => editOption(it.id, null) }, "Add an option")
      );
    }
    return h(
      "div",
      { class: "options" },
      cands.map((c) => optionCard(it, c)),
      h("button", { class: "opt add", type: "button", onclick: () => editOption(it.id, null), html: ICON.plus + "<span>Add option</span>" })
    );
  }

  function optionCard(it, c) {
    const picked = it.chosen === c.id;
    const photo = h("div", { class: "opt-photo" });
    if (c.img) {
      const img = h("img", { src: c.img, alt: c.label || "", loading: "lazy", referrerpolicy: "no-referrer" });
      img.addEventListener("error", () => img.replaceWith("Photo didn't load"));
      photo.append(img);
    } else photo.append("No photo yet");
    if (picked) photo.append(h("span", { class: "pick-badge" }, "Picked"));

    const hearts = Object.keys(PEOPLE).map((p) => {
      const on = it[PEOPLE[p].heart] === c.id;
      const mine = p === S.me;
      return h("button", {
        class: `heart ${PEOPLE[p].cls}${on ? " on" : ""}`,
        type: "button",
        disabled: !mine,
        "aria-pressed": String(on),
        "aria-label": mine ? `I like ${c.label}` : `${PEOPLE[p].name} likes ${c.label}`,
        onclick: mine ? () => patchItem(it.id, { [PEOPLE[p].heart]: on ? null : c.id }, { redraw: true }) : null,
        html: `${ICON.heart}<span>${PEOPLE[p].name}</span>`,
      });
    });

    return h(
      "div",
      { class: "opt" + (picked ? " is-picked" : "") },
      photo,
      h(
        "div",
        { class: "opt-body" },
        h("div", { class: "opt-label" }, c.label || "Option"),
        h("div", { class: "opt-meta" }, h("span", { class: "price" }, num(c.price) != null ? money(num(c.price), true) : "Price not set"), h("span", null, hostOf(c.url))),
        h("div", { class: "opt-actions" }, hearts),
        h(
          "div",
          { class: "opt-actions" },
          c.url ? h("a", { class: "btn small", href: c.url, target: "_blank", rel: "noopener noreferrer" }, "Open link") : null,
          h(
            "button",
            {
              class: "btn small",
              type: "button",
              onclick: () =>
                patchItem(
                  it.id,
                  picked ? { chosen: null, status: it.status === "decided" ? "considering" : it.status } : { chosen: c.id, status: it.status === "considering" ? "decided" : it.status },
                  { redraw: true }
                ),
            },
            picked ? "Unpick" : "Pick this"
          ),
          h("button", { class: "btn small", type: "button", onclick: () => editOption(it.id, c.id) }, "Edit")
        )
      )
    );
  }

  function priceCheckBlock(it) {
    const d = dealFor(it);
    if (!d || it.status === "bought") return null;
    const best = d.best;
    const optLines = Object.entries(d.options || {})
      .map(([cid, o]) => {
        const c = (it.cands || []).find((x) => x.id === cid);
        if (!c || num(o.price) == null) return null;
        return h(
          "li",
          null,
          h("b", null, c.label || "Option"),
          ` ${money(num(o.price), true)}`,
          o.store ? ` at ${o.store}` : "",
          o.url ? h("a", { href: o.url, target: "_blank", rel: "noopener noreferrer", class: "deal-link" }, "Open") : null
        );
      })
      .filter(Boolean);
    return h(
      "div",
      { class: "block deal-block" + (dealIsGood(it, d) ? " good" : "") },
      h("h3", null, "Best price seen"),
      best && num(best.price) != null
        ? h(
            "div",
            { class: "deal-best" },
            h("b", null, money(num(best.price), true)),
            best.store ? ` at ${best.store}` : "",
            dealIsGood(it, d) ? h("span", { class: "chip deal good" }, "Below your ballpark") : null
          )
        : h("p", { class: "price-note" }, "No price found yet."),
      best?.note ? h("p", { class: "price-note" }, best.note) : null,
      best?.url ? h("a", { class: "btn small", href: best.url, target: "_blank", rel: "noopener noreferrer" }, "Open the deal") : null,
      optLines.length > 1 ? h("ul", { class: "deal-opts" }, optLines) : null,
      h("p", { class: "price-note" }, `Checked ${checkedAt()}. Found by search, so confirm the price on the store page before you buy.`)
    );
  }

  function priceBlock(it) {
    const cands = it.cands || [];
    const chosen = cands.find((c) => c.id === it.chosen && num(c.price) != null);
    return h(
      "div",
      { class: "block" },
      h("h3", null, "Price"),
      h(
        "div",
        { class: "pair" },
        field("Ballpark low (each)", moneyInput(it.low, (v) => patchItem(it.id, { low: v }, { redraw: true }))),
        field("Ballpark high (each)", moneyInput(it.high, (v) => patchItem(it.id, { high: v }, { redraw: true })))
      ),
      chosen ? h("p", { class: "hint" }, `Totals use the picked option's price, ${money(num(chosen.price), true)}.`) : null,
      h(
        "div",
        { class: "pair" },
        field("Quantity", qtyStepper(it.status === "bought" ? purchaseOf(it).qty : qtyOf(it), (n) => setQty(it.id, n))),
        field("Retail price (each)", moneyInput(it.regular, (v) => patchItem(it.id, { regular: v }), "Optional"), "The normal non-sale price. Used to show what you saved.")
      ),
      it.priceNote ? h("p", { class: "price-note" }, `Price check, Nov 22: ${it.priceNote}`) : null
    );
  }

  function takesBlock(it) {
    const me = S.me;
    const other = OTHER[me];
    const otherNote = it[PEOPLE[other].note];
    return h(
      "div",
      { class: "block" },
      h("h3", null, "Notes"),
      h(
        "div",
        { class: `take ${PEOPLE[me].cls}` },
        h("h4", null, `${PEOPLE[me].name} (you)`),
        h("textarea", {
          class: "textarea",
          rows: "2",
          placeholder: `Your take, for ${PEOPLE[other].name} to read`,
          value: it[PEOPLE[me].note] || "",
          onchange: (e) => patchItem(it.id, { [PEOPLE[me].note]: e.target.value }),
        })
      ),
      h(
        "div",
        { class: `take ${PEOPLE[other].cls}` },
        h("h4", null, PEOPLE[other].name),
        otherNote ? h("p", null, otherNote) : h("p", { class: "empty-take" }, "No note yet.")
      )
    );
  }

  function actionsBlock(it) {
    if (it.status === "bought") {
      return h(
        "div",
        { class: "block" },
        h(
          "button",
          {
            class: "btn block",
            type: "button",
            onclick: () => {
              patchItem(it.id, { status: it.chosen ? "decided" : "considering", purchase: null }, { redraw: true });
              toast("Moved back to the list");
            },
          },
          "Undo purchase"
        )
      );
    }
    const statuses = [
      ["considering", "Considering"],
      ["decided", "Decided"],
      ["passed", "Pass"],
    ];
    return h(
      "div",
      null,
      h(
        "div",
        { class: "block" },
        h("h3", null, "Status"),
        h(
          "div",
          { class: "segctl" },
          statuses.map(([k, label]) =>
            h(
              "button",
              {
                type: "button",
                "aria-pressed": String(it.status === k),
                onclick: () => patchItem(it.id, { status: k }, { redraw: true }),
              },
              label
            )
          )
        )
      ),
      h("button", { class: "btn money block", type: "button", onclick: () => markBought(it.id) }, "Mark bought"),
      h(
        "div",
        { style: "text-align:center;margin-top:18px" },
        h(
          "button",
          {
            class: "btn danger",
            type: "button",
            onclick: () => {
              if (confirm(`Delete "${it.title}"? This removes it for both of you.`)) {
                popSheet();
                deleteItem(it.id);
                toast("Deleted");
              }
            },
          },
          "Delete idea"
        )
      )
    );
  }

  // Changing the quantity of something already bought keeps the price each and updates the total.
  function setQty(id, n) {
    const it = item(id);
    if (it.status !== "bought" || !it.purchase) return patchItem(id, { qty: n }, { redraw: true });
    const p = purchaseOf(it);
    patchItem(id, { qty: n, purchase: purchaseRecord({ ...p, qty: n }) }, { redraw: true });
  }

  function purchaseRecord(st) {
    const qty = Math.max(1, Math.round(num(st.qty) || 1));
    const each = st.gift ? null : num(st.each);
    const regularEach = num(st.regularEach);
    return {
      cand: st.cand || null,
      qty,
      gift: !!st.gift,
      each,
      paid: each == null ? null : round2(each * qty),
      regularEach,
      regular: regularEach == null ? null : round2(regularEach * qty),
      store: st.gift ? "" : String(st.store || "").trim(),
      from: st.gift ? String(st.from || "").trim() : "",
      date: st.date || today(),
    };
  }

  // ---------- Mark bought / edit purchase ----------
  function markBought(id) {
    const it = item(id);
    const editing = it.status === "bought" && !!it.purchase;
    const cands = it.cands || [];
    const mineHeart = it[PEOPLE[S.me].heart];
    const defaultCand = cands.find((c) => c.id === it.chosen) || cands.find((c) => c.id === mineHeart) || cands[0] || null;
    const unitGuess = (c) => round2(num(c?.price) ?? num(it.low));
    const st = editing
      ? { ...purchaseOf(it), cand: it.purchase.cand || "" }
      : {
          cand: defaultCand?.id || "",
          qty: qtyOf(it),
          gift: false,
          each: unitGuess(defaultCand),
          store: hostOf(defaultCand?.url),
          from: "",
          date: today(),
          regularEach: num(it.regular),
        };
    pushSheet({
      render(body, head, entry) {
        sheetHead(head, {
          left: ["Cancel", popSheet],
          title: editing ? "Edit purchase" : "Mark bought",
          right: [
            "Save",
            () => {
              if (document.activeElement) document.activeElement.blur();
              setTimeout(() => {
                const rec = purchaseRecord(st);
                patchItem(id, { status: "bought", qty: rec.qty, chosen: st.cand || it.chosen, purchase: rec }, { redraw: true });
                popSheet();
                toast(rec.gift ? "Marked as a gift" : `${editing ? "Saved" : "Marked bought"}: ${money(rec.paid, true) || "no amount"}`);
              });
            },
          ],
        });
        const redraw = () => {
          if (document.activeElement) document.activeElement.blur();
          setTimeout(() => entry.draw());
        };
        body.append(
          h(
            "div",
            { class: "segctl gift-seg" },
            [
              [false, "We bought it"],
              [true, "It was a gift"],
            ].map(([g, label]) =>
              h(
                "button",
                {
                  type: "button",
                  "aria-pressed": String(!!st.gift === g),
                  onclick: () => {
                    st.gift = g;
                    redraw();
                  },
                },
                label
              )
            )
          )
        );
        if (cands.length) {
          const sel = h(
            "select",
            {
              class: "select input",
              onchange: (e) => {
                st.cand = e.target.value;
                const c = cands.find((x) => x.id === st.cand);
                if (!st.gift && c && unitGuess(c) != null) {
                  st.each = unitGuess(c);
                  eachInput.querySelector("input").value = String(st.each);
                  showTotal();
                }
                if (c?.url && !st.store && storeInput) {
                  st.store = hostOf(c.url);
                  storeInput.value = st.store;
                }
              },
            },
            cands.map((c) => h("option", { value: c.id, selected: c.id === st.cand }, c.label || "Option")),
            h("option", { value: "", selected: !st.cand }, "Something else")
          );
          body.append(field("Which one", sel));
        }
        const total = h("p", { class: "hint purchase-total" });
        const showTotal = () => {
          const e = num(st.each);
          const q = Math.max(1, num(st.qty) || 1);
          total.textContent = e == null ? "" : q > 1 ? `Total ${money(round2(e * q), true)} for ${q}` : "";
        };
        const qtyField = field(
          "How many",
          qtyStepper(st.qty, (n) => {
            st.qty = n;
            showTotal();
          })
        );
        const dateField = field("Date", h("input", { class: "input", type: "date", value: st.date, onchange: (e) => (st.date = e.target.value) }));
        let eachInput = null;
        let storeInput = null;
        if (st.gift) {
          body.append(
            qtyField,
            field("From", h("input", { class: "input", value: st.from || "", placeholder: "Optional", oninput: (e) => (st.from = e.target.value) })),
            dateField,
            h("p", { class: "hint" }, "Gifts show up under Bought but don't count toward what you spent or the budget.")
          );
        } else {
          eachInput = moneyInput(st.each, (v) => {
            st.each = v;
            showTotal();
          });
          storeInput = h("input", { class: "input", value: st.store || "", placeholder: "Costco, Amazon…", oninput: (e) => (st.store = e.target.value) });
          body.append(
            h("div", { class: "pair" }, qtyField, field("Price each", eachInput)),
            total,
            h("p", { class: "hint" }, "Include tax if you want the tracker to match your card."),
            field("Store", storeInput),
            dateField,
            field("Retail price each", moneyInput(st.regularEach, (v) => (st.regularEach = v), "Optional"), "The normal non-sale price. You saved the difference between this and what you paid.")
          );
          showTotal();
        }
      },
    });
  }

  // ---------- Photos ----------
  async function shrinkImage(blob) {
    const bmp = await createImageBitmap(blob);
    const max = 1000;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  }

  async function uploadImage(blob) {
    const small = await shrinkImage(blob);
    const res = await fetch(S.api + "/api/images", {
      method: "POST",
      headers: { Authorization: "Bearer " + S.key, "Content-Type": "image/jpeg" },
      body: small,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Photo upload failed.");
    return body.url;
  }

  async function imageFromClipboard() {
    if (!navigator.clipboard?.read) throw new Error("This browser can't read photos from the clipboard. Use Choose photo instead.");
    const items = await navigator.clipboard.read();
    for (const ci of items) {
      const type = ci.types.find((t) => t.startsWith("image/"));
      if (type) return await ci.getType(type);
    }
    throw new Error("No photo on the clipboard. In Safari, press and hold the product photo, tap Copy, then try again.");
  }

  async function previewLink(url) {
    return await api("/api/preview?url=" + encodeURIComponent(url));
  }

  // ---------- Option editor ----------
  function editOption(itemId, candId) {
    const it = item(itemId);
    const existing = (it.cands || []).find((c) => c.id === candId);
    const st = existing ? { ...existing } : { id: uid(), label: "", url: "", img: null, price: null };
    let status = { text: "", bad: false };

    pushSheet({
      render(body, head, entry) {
        sheetHead(head, {
          left: ["Cancel", popSheet],
          title: existing ? "Edit option" : "Add option",
          right: [
            "Save",
            () => {
              if (document.activeElement) document.activeElement.blur();
              setTimeout(() => {
                const cur = item(itemId);
                const cands = [...(cur.cands || [])];
                const clean = { ...st, label: (st.label || "").trim() || hostOf(st.url) || "Option" };
                const i = cands.findIndex((c) => c.id === clean.id);
                if (i >= 0) cands[i] = clean;
                else cands.push(clean);
                patchItem(itemId, { cands }, { redraw: true });
                popSheet();
              });
            },
          ],
        });

        const statusEl = h("p", { class: "status-line" + (status.bad ? " bad" : "") }, status.text);
        const setStatus = (text, bad = false) => {
          status = { text, bad };
          statusEl.textContent = text;
          statusEl.className = "status-line" + (bad ? " bad" : "");
        };

        const fetchDetails = async () => {
          if (!st.url) return;
          setStatus("Reading the product page…");
          try {
            const p = await previewLink(st.url);
            if (!p.ok) {
              setStatus(p.reason || "Couldn't read that page. Add the photo and price yourself.", true);
              return;
            }
            if (p.title && !st.label) st.label = p.title;
            if (p.price != null && st.price == null) st.price = p.price;
            if (p.image) st.img = p.image;
            status = { text: `Got details from ${p.site || hostOf(st.url)}. Check the name and price.`, bad: false };
            entry.draw();
          } catch (e) {
            setStatus(e.message, true);
          }
        };

        const urlInput = h("input", {
          class: "input",
          type: "url",
          inputmode: "url",
          placeholder: "Paste a product link",
          value: st.url || "",
          onchange: (e) => {
            st.url = e.target.value.trim();
            fetchDetails();
          },
        });

        const photoBox = h("div", { class: "photo-edit" });
        if (st.img) photoBox.append(h("img", { src: st.img, alt: "", referrerpolicy: "no-referrer" }));
        else photoBox.append("No photo yet");

        const fileInput = h("input", {
          type: "file",
          accept: "image/*",
          hidden: true,
          onchange: async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setStatus("Uploading photo…");
            try {
              st.img = await uploadImage(f);
              status = { text: "Photo added.", bad: false };
              entry.draw();
            } catch (err) {
              setStatus(err.message, true);
            }
          },
        });

        body.append(
          field("Link", urlInput),
          h("div", { class: "btn-row", style: "margin:-4px 0 12px" }, h("button", { class: "btn small", type: "button", onclick: fetchDetails }, "Get details from link")),
          statusEl,
          field("Name", h("input", { class: "input", value: st.label || "", placeholder: "e.g. Ocean, or Wallbox Pulsar Plus", oninput: (e) => (st.label = e.target.value) })),
          field("Price (each)", moneyInput(st.price, (v) => (st.price = v))),
          h("div", { class: "field" }, h("span", null, "Photo"), photoBox),
          h(
            "div",
            { class: "btn-row" },
            h(
              "button",
              {
                class: "btn small",
                type: "button",
                onclick: async () => {
                  try {
                    const blob = await imageFromClipboard();
                    setStatus("Uploading photo…");
                    st.img = await uploadImage(blob);
                    status = { text: "Photo added.", bad: false };
                    entry.draw();
                  } catch (err) {
                    setStatus(err.message, true);
                  }
                },
              },
              "Paste photo"
            ),
            h("button", { class: "btn small", type: "button", onclick: () => fileInput.click() }, "Choose photo"),
            st.img
              ? h(
                  "button",
                  {
                    class: "btn small danger",
                    type: "button",
                    onclick: () => {
                      st.img = null;
                      entry.draw();
                    },
                  },
                  "Remove photo"
                )
              : null,
            fileInput
          ),
          h("p", { class: "hint", style: "margin-top:10px" }, "To copy a photo in Safari: press and hold it, tap Copy, then tap Paste photo here.")
        );

        if (existing) {
          body.append(
            h(
              "div",
              { style: "text-align:center;margin-top:18px" },
              h(
                "button",
                {
                  class: "btn danger",
                  type: "button",
                  onclick: () => {
                    const cur = item(itemId);
                    const patch = { cands: (cur.cands || []).filter((c) => c.id !== existing.id) };
                    if (cur.chosen === existing.id) patch.chosen = null;
                    for (const p of Object.values(PEOPLE)) if (cur[p.heart] === existing.id) patch[p.heart] = null;
                    patchItem(itemId, patch, { redraw: true });
                    popSheet();
                  },
                },
                "Remove this option"
              )
            )
          );
        }
      },
    });
  }

  // ---------- Add idea ----------
  function openAdd() {
    const st = { title: "", why: "", url: "", low: null, high: null, qty: 1, cand: null };
    let status = { text: "", bad: false };
    pushSheet({
      render(body, head, entry) {
        sheetHead(head, {
          left: ["Cancel", popSheet],
          title: "New idea",
          right: [
            "Add",
            () => {
              if (document.activeElement) document.activeElement.blur();
              setTimeout(async () => {
                const title = st.title.trim() || st.cand?.label || "";
                if (!title) {
                  toast("Give the idea a name first.");
                  return;
                }
                const cands = st.cand ? [st.cand] : st.url ? [{ id: uid(), label: hostOf(st.url), url: st.url, img: null, price: null }] : [];
                popSheet();
                await createItem({ title, why: st.why, low: st.low, high: st.high, qty: st.qty, cands });
                toast("Added. Sort it into a tier when you're ready.");
              });
            },
          ],
        });

        const statusEl = h("p", { class: "status-line" + (status.bad ? " bad" : "") }, status.text);
        const titleInput = h("input", { class: "input", value: st.title, placeholder: "e.g. Stand mixer", oninput: (e) => (st.title = e.target.value) });

        body.append(
          field("What is it?", titleInput),
          field(
            "Why we want it",
            h("textarea", { class: "textarea", rows: "3", placeholder: "The pitch", value: st.why, oninput: (e) => (st.why = e.target.value) })
          ),
          field(
            "Product link (optional)",
            h("input", {
              class: "input",
              type: "url",
              inputmode: "url",
              placeholder: "Paste a link to fill in the photo and price",
              value: st.url,
              onchange: async (e) => {
                st.url = e.target.value.trim();
                if (!st.url) return;
                statusEl.textContent = "Reading the product page…";
                statusEl.className = "status-line";
                try {
                  const p = await previewLink(st.url);
                  if (!p.ok) {
                    status = { text: p.reason || "Couldn't read that page. You can add the photo later.", bad: true };
                  } else {
                    st.cand = { id: uid(), label: p.title || hostOf(st.url), url: st.url, img: p.image || null, price: p.price ?? null };
                    if (!st.title.trim() && p.title) st.title = p.title;
                    if (st.low == null && p.price != null) st.low = p.price;
                    status = { text: `Got ${p.image ? "the photo and " : ""}details from ${p.site || hostOf(st.url)}.`, bad: false };
                  }
                } catch (err) {
                  status = { text: err.message, bad: true };
                }
                entry.draw();
              },
            })
          ),
          statusEl,
          st.cand?.img ? h("div", { class: "photo-edit", style: "max-width:220px" }, h("img", { src: st.cand.img, alt: "", referrerpolicy: "no-referrer" })) : null,
          h(
            "div",
            { class: "pair" },
            field("Ballpark low (each)", moneyInput(st.low, (v) => (st.low = v))),
            field("Ballpark high (each)", moneyInput(st.high, (v) => (st.high = v), "Optional"))
          ),
          field("Quantity", qtyStepper(st.qty, (n) => (st.qty = n)))
        );
        if (!st.title) setTimeout(() => titleInput.focus(), 250);
      },
    });
  }

  // ---------- Settings ----------
  function openSettings() {
    pushSheet({
      live: true,
      render(body, head, entry) {
        sheetHead(head, { left: null, title: "Settings", right: ["Done", popSheet] });
        const other = OTHER[S.me];
        const standalone = window.navigator.standalone || matchMedia("(display-mode: standalone)").matches;

        body.append(
          h(
            "div",
            { class: "set-group" },
            h("h3", null, "Who's using this phone"),
            h("p", null, "Rankings, hearts and notes are saved under this name."),
            h(
              "div",
              { class: "segctl" },
              Object.keys(PEOPLE).map((p) =>
                h(
                  "button",
                  {
                    type: "button",
                    "aria-pressed": String(S.me === p),
                    onclick: () => {
                      S.me = p;
                      S.view = p;
                      saveCfg();
                      history.replaceState(null, "", linkFor(S.me));
                      render();
                      entry.draw();
                    },
                  },
                  PEOPLE[p].name
                )
              )
            )
          ),
          h(
            "div",
            { class: "set-group" },
            h("h3", null, "Budget"),
            h("p", null, "Optional. Shows a bar on the price tag and a cutoff line in the Together view."),
            moneyInput(S.data.meta?.budget ?? null, (v) => saveMeta({ budget: v }), "No budget")
          ),
          h(
            "div",
            { class: "set-group" },
            h("h3", null, `Send ${PEOPLE[other].name} the list`),
            h("p", null, `Opens the share sheet with ${PEOPLE[other].name}'s own link. The link already says whose it is, so there's nothing to set up on that phone.`),
            h(
              "div",
              { class: "btn-row" },
              h("button", { class: "btn primary", type: "button", onclick: () => shareLink(other) }, `Send ${PEOPLE[other].name}'s link`),
              h("button", { class: "btn", type: "button", onclick: () => copyText(linkFor(S.me), "Your link is copied.") }, "Copy my link")
            )
          ),
          !standalone
            ? h(
                "div",
                { class: "set-group" },
                h("h3", null, "Add to Home Screen"),
                h("p", null, "In Safari, tap Share, then Add to Home Screen. It opens like an app and stays connected.")
              )
            : null,
          h(
            "div",
            { class: "set-group" },
            h("h3", null, "Photos"),
            h("p", null, "Fill in photos for options that have a link but no photo yet."),
            h("button", { class: "btn", type: "button", onclick: () => fillPhotos() }, "Fill in missing photos")
          ),
          h(
            "div",
            { class: "set-group" },
            h("h3", null, "Backup"),
            h("p", null, "Download everything as a JSON file."),
            h("button", { class: "btn", type: "button", onclick: downloadBackup }, "Download backup")
          ),
          h(
            "div",
            { class: "set-group" },
            h("h3", null, "Connection"),
            h("p", { class: "mono" }, S.api),
            h(
              "button",
              {
                class: "btn danger",
                type: "button",
                onclick: () => {
                  if (!confirm("Disconnect this phone? The list stays saved; you'll need your link to reconnect.")) return;
                  try { localStorage.removeItem(STORE); } catch { /* ignore */ }
                  location.href = location.href.split("#")[0];
                },
              },
              "Disconnect this phone"
            )
          )
        );
      },
    });
  }

  async function shareLink(person) {
    const url = linkFor(person);
    const text = `Our Black Friday list. Open it in Safari, then Share → Add to Home Screen.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Black Friday", text, url });
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
    copyText(url, `${PEOPLE[person].name}'s link is copied.`);
  }

  async function copyText(text, msg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(msg);
    } catch {
      prompt("Copy this:", text);
    }
  }

  function downloadBackup() {
    const blob = new Blob([JSON.stringify(S.data, null, 2)], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: `black-friday-${today()}.json` });
    document.body.append(a);
    a.click();
    a.remove();
  }

  // ---------- Seeding and photo fill ----------
  async function seedList(btn) {
    if (btn) btn.disabled = true;
    try {
      await api("/api/seed", { method: "POST", body: JSON.stringify({ items: window.BF_SEED || [], by: S.me }) });
      await refresh();
      toast("Loaded. Getting product photos…");
      fillPhotos({ quiet: true });
    } catch (e) {
      toast(e.message);
      if (btn) btn.disabled = false;
    }
  }

  let filling = false;
  async function fillPhotos({ quiet = false } = {}) {
    if (filling) return;
    filling = true;
    const cache = new Map();
    const todo = S.data.items.filter((it) => (it.cands || []).some((c) => c.url && !c.img));
    let got = 0;
    let blocked = 0;
    for (const it of todo) {
      const cands = (item(it.id)?.cands || []).map((c) => ({ ...c }));
      let changed = false;
      for (const c of cands) {
        if (!c.url || c.img) continue;
        let p = cache.get(c.url);
        if (!p) {
          try { p = await previewLink(c.url); } catch { p = { ok: false }; }
          cache.set(c.url, p);
        }
        if (p.ok && p.image) {
          c.img = p.image;
          if (c.price == null && p.price != null) c.price = p.price;
          changed = true;
          got++;
        } else blocked++;
      }
      if (changed) await patchItem(it.id, { cands });
    }
    filling = false;
    if (!quiet || got || blocked) {
      toast(
        todo.length === 0
          ? "Every option with a link already has a photo."
          : `Got ${got} ${got === 1 ? "photo" : "photos"}.${blocked ? ` ${blocked} ${blocked === 1 ? "store" : "stores"} blocked it; paste those photos yourself.` : ""}`,
        4200
      );
    }
  }

  // ---------- Setup screen ----------
  function showSetup({ partial = null, error = "" } = {}) {
    $("#app").hidden = true;
    const el = $("#setup");
    el.hidden = false;
    const st = { link: "", api: partial?.api || "", key: partial?.key || "", me: partial?.me || "" };
    const statusEl = h("p", { class: "status-line" + (error ? " bad" : "") }, error);

    const connect = async (cfg) => {
      if (!cfg.api || !cfg.key) {
        statusEl.textContent = "That link is missing the list address or key.";
        statusEl.className = "status-line bad";
        return;
      }
      if (!cfg.me) {
        statusEl.textContent = "Pick who's using this phone.";
        statusEl.className = "status-line bad";
        return;
      }
      statusEl.textContent = "Connecting…";
      statusEl.className = "status-line";
      Object.assign(S, { api: cfg.api.replace(/\/+$/, ""), key: cfg.key, me: cfg.me, view: cfg.me });
      try {
        await api("/api/rev");
      } catch (e) {
        statusEl.textContent = e.message;
        statusEl.className = "status-line bad";
        return;
      }
      saveCfg();
      history.replaceState(null, "", linkFor(S.me));
      start();
    };

    const whoCtl = h(
      "div",
      { class: "segctl" },
      Object.keys(PEOPLE).map((p) =>
        h(
          "button",
          {
            type: "button",
            "aria-pressed": String(st.me === p),
            onclick: (e) => {
              st.me = p;
              for (const b of whoCtl.children) b.setAttribute("aria-pressed", String(b === e.currentTarget));
            },
          },
          PEOPLE[p].name
        )
      )
    );

    const pieces = [
      h("h1", { class: "wordmark" }, "Black Friday"),
      h(
        "section",
        { class: "tag" },
        h("span", { class: "tag-amount", style: "font-size:26px" }, "Connect this phone"),
        h("span", { class: "tag-caption" }, "Your list lives online, so both phones see the same thing.")
      ),
    ];

    if (partial?.api && partial?.key) {
      pieces.push(h("h2", null, "Who's using this phone?"), whoCtl, h("div", { style: "height:16px" }), h("button", { class: "btn primary block", type: "button", onclick: () => connect(st) }, "Continue"), statusEl);
    } else {
      pieces.push(
        h("h2", null, "Paste your link"),
        h("p", null, "Use the link from your text. It includes the address and the key."),
        h("textarea", { class: "textarea", rows: "3", placeholder: "https://…/black-friday/#api=…", oninput: (e) => (st.link = e.target.value) }),
        h("div", { style: "height:12px" }),
        h(
          "button",
          {
            class: "btn primary block",
            type: "button",
            onclick: () => {
              const p = parseLink(st.link.trim());
              if (!p) {
                statusEl.textContent = "That doesn't look like a Black Friday link. It should contain #api= and k=.";
                statusEl.className = "status-line bad";
                return;
              }
              if (!p.me) {
                showSetup({ partial: p });
                return;
              }
              connect(p);
            },
          },
          "Connect"
        ),
        statusEl,
        h(
          "details",
          null,
          h("summary", null, "First-time setup"),
          h("p", null, "Use the Worker address from the deploy run and the key you saved as BF_LIST_KEY."),
          field("Worker address", h("input", { class: "input", type: "url", inputmode: "url", placeholder: "https://black-friday.yourname.workers.dev", value: st.api, oninput: (e) => (st.api = e.target.value.trim()) })),
          field("Key", h("input", { class: "input", autocapitalize: "off", autocomplete: "off", spellcheck: "false", value: st.key, oninput: (e) => (st.key = e.target.value.trim()) })),
          h("div", { class: "field" }, h("span", null, "Who's using this phone?"), whoCtl),
          h("button", { class: "btn primary block", type: "button", onclick: () => connect(st) }, "Connect")
        )
      );
    }
    el.replaceChildren(...pieces);
  }

  // ---------- Boot ----------
  function wire() {
    if (S.wired) return;
    S.wired = true;
    $("#btn-settings").addEventListener("click", openSettings);
    $("#btn-add").addEventListener("click", openAdd);
    for (const b of document.querySelectorAll(".bar-tab")) {
      b.addEventListener("click", () => {
        S.tab = b.dataset.tab;
        render();
        window.scrollTo(0, 0);
      });
    }
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) poll();
    });
    document.addEventListener("pointerup", () => {
      if (!S.dragging && S.pendingRender) {
        S.pendingRender = false;
        render();
      }
    });
  }

  async function start() {
    $("#setup").hidden = true;
    $("#app").hidden = false;
    if (!["jonathan", "rachel", "together"].includes(S.view)) S.view = S.me;
    wire();
    try {
      await refresh();
    } catch (e) {
      $("#main").replaceChildren(
        h(
          "div",
          { class: "empty" },
          h("h2", null, "Can't load the list"),
          h("p", null, e.message),
          h("button", { class: "btn primary", type: "button", onclick: () => start() }, "Try again")
        )
      );
      setOnline(false);
    }
    clearInterval(S.pollTimer);
    S.pollTimer = setInterval(poll, POLL_MS);
    loadDeals();
    clearInterval(S.dealTimer);
    S.dealTimer = setInterval(loadDeals, 15 * 60 * 1000);
  }

  function boot() {
    const cfg = loadCfg();
    Object.assign(S, { api: cfg.api || "", key: cfg.key || "", me: cfg.me || "", view: cfg.view || "" });
    const fromLink = parseLink(location.hash);
    if (fromLink) {
      S.api = fromLink.api;
      S.key = fromLink.key;
      if (fromLink.me) {
        if (fromLink.me !== S.me) S.view = fromLink.me;
        S.me = fromLink.me;
      }
    }
    if (!S.api || !S.key) return showSetup();
    if (!S.me) return showSetup({ partial: { api: S.api, key: S.key } });
    saveCfg();
    // Keep the full link in the address bar so Add to Home Screen captures it.
    history.replaceState(null, "", linkFor(S.me));
    start();
  }

  boot();
})();
