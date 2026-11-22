// Black Friday list — sync backend.
// One Durable Object ("household") holds everything in SQLite:
//   items  : one JSON row per idea (patched field-by-field so two phones don't clobber each other)
//   kv     : rankings per person, budget, and a revision counter the app polls
//   images : photos pasted or uploaded from the phones
// The Worker in front checks the shared key, handles CORS, and reads product pages for previews.

import { DurableObject } from "cloudflare:workers";

const PEOPLE = ["jonathan", "rachel"];
const MAX_IMAGE_BYTES = 1_500_000;

export class List extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data BLOB NOT NULL, created_at INTEGER NOT NULL);
    `);
  }

  #get(k, fallback) {
    const row = this.sql.exec("SELECT v FROM kv WHERE k = ?", k).toArray()[0];
    return row ? JSON.parse(row.v) : fallback;
  }
  #set(k, v) {
    this.sql.exec("INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", k, JSON.stringify(v));
  }
  #bump() {
    const rev = this.#get("rev", 0) + 1;
    this.#set("rev", rev);
    return rev;
  }

  rev() {
    return this.#get("rev", 0);
  }

  state() {
    const items = this.sql
      .exec("SELECT data FROM items WHERE deleted = 0 ORDER BY updated_at")
      .toArray()
      .map((r) => JSON.parse(r.data));
    const ranks = {};
    for (const p of PEOPLE) ranks[p] = this.#get(`ranks:${p}`, { must: [], want: [], maybe: [] });
    return { rev: this.rev(), items, ranks, meta: this.#get("meta", { budget: null }) };
  }

  // Shallow-merge a patch into an item (creates it if new). Top-level fields are the unit of
  // conflict, which is why each person's note and heart live in their own field.
  putItem(id, patch, by) {
    const row = this.sql.exec("SELECT data FROM items WHERE id = ?", id).toArray()[0];
    const now = Date.now();
    const base = row ? JSON.parse(row.data) : { id, created: now, createdBy: by };
    const next = { ...base, ...patch, id, updated: now, updatedBy: by };
    this.sql.exec(
      "INSERT INTO items (id, data, updated_at, deleted) VALUES (?, ?, ?, 0) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, deleted = 0",
      id, JSON.stringify(next), now
    );
    return { item: next, rev: this.#bump() };
  }

  deleteItem(id) {
    this.sql.exec("UPDATE items SET deleted = 1, updated_at = ? WHERE id = ?", Date.now(), id);
    return { rev: this.#bump() };
  }

  putRanks(person, tiers) {
    const clean = { must: [], want: [], maybe: [] };
    for (const t of Object.keys(clean)) clean[t] = Array.isArray(tiers?.[t]) ? tiers[t].map(String) : [];
    this.#set(`ranks:${person}`, clean);
    return { rev: this.#bump() };
  }

  putMeta(patch) {
    const meta = { ...this.#get("meta", { budget: null }), ...patch };
    this.#set("meta", meta);
    return { meta, rev: this.#bump() };
  }

  // Only seeds when the list has never had items, so a double-tap can't duplicate the list.
  seed(items, by) {
    const count = this.sql.exec("SELECT COUNT(*) AS n FROM items").toArray()[0].n;
    if (count > 0) return { seeded: false, rev: this.rev() };
    const now = Date.now();
    items.forEach((it, i) => {
      const data = { ...it, created: now + i, createdBy: by, updated: now + i, updatedBy: by };
      this.sql.exec("INSERT INTO items (id, data, updated_at, deleted) VALUES (?, ?, ?, 0)", String(it.id), JSON.stringify(data), now + i);
    });
    return { seeded: true, rev: this.#bump() };
  }

  putImage(id, mime, bytes) {
    this.sql.exec("INSERT OR REPLACE INTO images (id, mime, data, created_at) VALUES (?, ?, ?, ?)", id, mime, bytes, Date.now());
    return { id };
  }

  getImage(id) {
    const row = this.sql.exec("SELECT mime, data FROM images WHERE id = ?", id).toArray()[0];
    return row ? { mime: row.mime, data: row.data } : null;
  }
}

// ---------- Worker ----------

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS } });
const fail = (status, message) => json({ error: message }, status);

function keyMatches(given, expected) {
  if (!given || !expected) return false;
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  if (a.byteLength !== b.byteLength) return false;
  return crypto.subtle.timingSafeEqual(a, b);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");
    const list = env.LIST.get(env.LIST.idFromName("household"));

    // Photos load straight into <img> tags, which can't send a header. Their ids are random UUIDs.
    const img = path.match(/^\/api\/img\/([\w-]{8,64})$/);
    if (img && request.method === "GET") {
      const found = await list.getImage(img[1]);
      if (!found) return new Response("Not found", { status: 404, headers: CORS });
      return new Response(found.data, {
        headers: { "Content-Type": found.mime, "Cache-Control": "public, max-age=31536000, immutable", ...CORS },
      });
    }

    if (path === "" || path === "/") return json({ ok: true, app: "black-friday" });

    const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!keyMatches(token, env.LIST_KEY)) return fail(401, "This link's key doesn't match. Open the link from your text again.");

    try {
      if (path === "/api/rev" && request.method === "GET") return json({ rev: await list.rev() });
      if (path === "/api/state" && request.method === "GET") return json(await list.state());

      const item = path.match(/^\/api\/items\/([\w-]{4,64})$/);
      if (item && request.method === "PUT") {
        const body = await request.json();
        if (!body || typeof body.patch !== "object") return fail(400, "Missing patch");
        return json(await list.putItem(item[1], body.patch, String(body.by || "")));
      }
      if (item && request.method === "DELETE") return json(await list.deleteItem(item[1]));

      const ranks = path.match(/^\/api\/ranks\/(jonathan|rachel)$/);
      if (ranks && request.method === "PUT") {
        const body = await request.json();
        return json(await list.putRanks(ranks[1], body.tiers));
      }

      if (path === "/api/meta" && request.method === "PUT") return json(await list.putMeta(await request.json()));

      if (path === "/api/seed" && request.method === "POST") {
        const body = await request.json();
        if (!Array.isArray(body.items)) return fail(400, "Missing items");
        return json(await list.seed(body.items, String(body.by || "")));
      }

      if (path === "/api/images" && request.method === "POST") {
        const mime = request.headers.get("Content-Type") || "";
        if (!/^image\/(jpeg|png|webp|gif|heic)$/.test(mime)) return fail(415, "Send a JPEG, PNG, WebP or GIF");
        const bytes = await request.arrayBuffer();
        if (bytes.byteLength > MAX_IMAGE_BYTES) return fail(413, "Photo is too large");
        const id = crypto.randomUUID();
        await list.putImage(id, mime, bytes);
        return json({ id, url: `${url.origin}/api/img/${id}` });
      }

      if (path === "/api/preview" && request.method === "GET") {
        const target = url.searchParams.get("url");
        if (!target) return fail(400, "Missing url");
        return json(await preview(target));
      }

      return fail(404, "Unknown route");
    } catch (err) {
      return fail(500, err?.message || "Server error");
    }
  },
};

// ---------- Link previews ----------
// Reads the first part of a product page and pulls the name, photo and price from the tags
// retailers publish for link previews and search engines (Open Graph, JSON-LD, microdata).

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

async function preview(target) {
  let u;
  try {
    u = new URL(target);
  } catch {
    return { ok: false, reason: "That doesn't look like a link." };
  }
  if (!/^https?:$/.test(u.protocol)) return { ok: false, reason: "Only web links work here." };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  let res;
  try {
    res = await fetch(u.toString(), { headers: BROWSER_HEADERS, redirect: "follow", signal: controller.signal });
  } catch {
    clearTimeout(timer);
    return { ok: false, reason: "The store didn't respond. Add the photo and price yourself." };
  }

  const html = await readHtml(res, 800_000).finally(() => clearTimeout(timer));
  const finalUrl = res.url || u.toString();
  const host = new URL(finalUrl).hostname.replace(/^www\./, "");
  const out = parseProductHtml(html, finalUrl);
  out.site = out.site || host;

  const blocked =
    !res.ok ||
    /robot check|captcha|access denied|are you a human/i.test(out.title || "") ||
    (/amazon\./.test(host) && /captcha/i.test(html.slice(0, 20000)));
  if (blocked && !out.image) {
    return { ok: false, blocked: true, site: out.site, reason: `${out.site} blocked the preview. Paste a photo and price instead.` };
  }
  return { ok: true, ...out };
}

async function readHtml(res, cap) {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  while (html.length < cap) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
  }
  reader.cancel().catch(() => {});
  return html;
}

const decodeEntities = (s) =>
  String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, " ")
    .trim();

const toNumber = (v) => {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function parseProductHtml(html, pageUrl) {
  const meta = {};
  // Meta tags live near the top; scanning only the first part keeps CPU time low on the free plan.
  for (const tag of html.slice(0, 400_000).match(/<meta\b[^>]*>/gi) || []) {
    const key = (tag.match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i) || [])[1];
    const val = (tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i) || [])[1];
    if (key && val != null && !(key.toLowerCase() in meta)) meta[key.toLowerCase()] = decodeEntities(val);
  }

  // JSON-LD Product blocks
  let ld = {};
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const found = findProduct(JSON.parse(m[1].trim()));
      if (found) {
        ld = found;
        break;
      }
    } catch {
      /* ignore malformed blocks */
    }
  }

  const offers = [].concat(ld.offers || []).flatMap((o) => (o && o.offers ? [].concat(o.offers) : [o]));
  const ldPrice = offers.map((o) => toNumber(o?.price ?? o?.lowPrice)).find((n) => n);

  const ldImage = (() => {
    const im = [].concat(ld.image || [])[0];
    return typeof im === "string" ? im : im?.url || im?.contentUrl || null;
  })();

  // Amazon-specific fallbacks for when the page loads normally
  const amazonImg = (html.match(/id=["']landingImage["'][^>]*data-old-hires=["']([^"']+)["']/i) || [])[1] ||
    (html.match(/"hiRes":"(https:[^"]+)"/) || [])[1];
  const amazonPrice = (html.match(/class=["']a-offscreen["'][^>]*>\s*\$([\d,]+\.\d{2})/i) || [])[1];

  const title =
    meta["og:title"] || ld.name || meta["twitter:title"] || decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]) || "";
  const imageRaw = meta["og:image:secure_url"] || meta["og:image"] || meta["twitter:image"] || meta["twitter:image:src"] || ldImage || amazonImg || null;
  const price =
    toNumber(meta["product:price:amount"]) ||
    toNumber(meta["og:price:amount"]) ||
    ldPrice ||
    toNumber(meta["price"]) ||
    toNumber(amazonPrice);

  let image = null;
  if (imageRaw) {
    try {
      image = new URL(decodeEntities(imageRaw), pageUrl).toString();
    } catch {
      image = null;
    }
  }

  return {
    title: cleanTitle(title),
    image,
    price: price || null,
    site: meta["og:site_name"] || null,
    url: meta["og:url"] || pageUrl,
  };
}

function findProduct(node) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const f = findProduct(n);
      if (f) return f;
    }
    return null;
  }
  const type = [].concat(node["@type"] || []).map(String);
  if (type.some((t) => /^(Product|ProductGroup|IndividualProduct)$/i.test(t))) {
    if (!node.offers && node.hasVariant) {
      const v = [].concat(node.hasVariant)[0];
      return { ...node, offers: v?.offers, image: node.image || v?.image };
    }
    return node;
  }
  if (node["@graph"]) return findProduct(node["@graph"]);
  return null;
}

function cleanTitle(t) {
  return decodeEntities(t)
    .replace(/^Amazon\.com\s*:\s*/i, "")
    .replace(/\s*[|:]\s*(Best Buy|Target|Walmart\.com|Williams Sonoma|Amazon\.com.*)$/i, "")
    .slice(0, 140);
}
