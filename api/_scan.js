// Reads a photo or PDF of a menu / rate card / service list and returns its sections, items and prices,
// so the studio can fill a business page in one go. Not a route: api/img.js passes { action: "scan" } here.
// AI reader, whichever key is set in Vercel:
//   GEMINI_API_KEY    Google Gemini (has a free tier: aistudio.google.com/apikey). GEMINI_MODEL changes the model.
//   ANTHROPIC_API_KEY Claude (paid). MENU_AI_MODEL changes the model.
// With neither, the studio uses the free reader that runs on the phone (assets/menu-ocr.v2.js).
const db = require("./_db");
const env = process.env;

const clip = (v, n) => String(v == null ? "" : v).replace(/<[^>]*>/g, "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const price = v => String(v == null ? "" : v).replace(/\/-/g, "").replace(/[^\d.,–\- ]/g, "").replace(/\s+/g, " ").replace(/^[\s.,–-]+|[\s.,–-]+$/g, "").slice(0, 12);
const day = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

const TOOL = {
  name: "save_items",
  description: "Save every item or service found in the document, grouped into its sections.",
  input_schema: {
    type: "object",
    properties: {
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Section heading as printed, e.g. 'Hot Coffee', 'Starters', 'Hair', 'Tax filing'. Make a sensible one if the document has none." },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Item or service name, tidy Title Case, spelling fixed." },
                  price: { type: "string", description: "Price as plain digits only, e.g. '180' or '1200'. For a range '500-800'. Empty if none is printed." },
                  desc: { type: "string", description: "Only what's printed with it: ingredients, sizes/variants with their prices (e.g. 'Half ₹120 · Full ₹220'), duration, 'starting price'. Empty if nothing." },
                  best: { type: "boolean", description: "True if marked as bestseller, chef's special, must try or with a star." }
                },
                required: ["name", "price"]
              }
            }
          },
          required: ["name", "items"]
        }
      }
    },
    required: ["sections"]
  }
};
const PROMPT = `This is a photo or file from an Indian small business: a café or restaurant menu, a salon / spa / gym rate card, a clinic, dentist or lab price list, a CA / lawyer / consultant service list, or a shop's product list.
Read EVERY item or service and its price, exactly as printed, and save them with the save_items tool.
Rules:
- Keep the document's own sections and order. Don't invent items or prices.
- Prices: digits only (no ₹, Rs or /-). If an item has several sizes or variants (Half/Full, S/M/L, Regular/Large, 30 min/60 min), use the lowest as the price and list all of them in desc, e.g. "Half ₹120 · Full ₹220".
- If a price says "onwards" or "starting", put the number in price and "Starting price" in desc.
- Write names in tidy Title Case and fix obvious spelling mistakes. Keep Hindi names in the script they're printed in.
- Skip things that aren't items: phone numbers, addresses, GST notes, "all prices inclusive of taxes", timings, logos.
- Ignore veg/non-veg symbols, food photos and decorations. Menus are often laid out as a grid of cards (name, then price, then description): read each card as one item.
- The image may be a screenshot: ignore phone status bars, app headers and buttons.
- If the image has no items at all, return an empty sections list.`;

// Same shape for Gemini (OpenAPI-style schema).
const up = o => o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, k === "type" ? String(v).toUpperCase() : k === "required" ? v : up(v)])) : o;
const GSCHEMA = up(TOOL.input_schema);

async function gemini(m, prompt, signal) {
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
    method: "POST", signal, headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ inline_data: { mime_type: m[1], data: m[2] } }, { text: prompt + "\nReturn the result as JSON." }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: GSCHEMA, temperature: 0, maxOutputTokens: 16000,
        // Reading a menu doesn't need "thinking": switching it off on 2.5 Flash makes it several times faster.
        ...(/^gemini-2\.5-flash/.test(model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}) } })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("scan: gemini", r.status, j && j.error && j.error.message);
    return { status: 502, error: r.status === 400 && /API key/i.test((j.error || {}).message || "") ? "The Gemini key in Vercel isn't valid." : r.status === 429 ? "Today's free scanning limit is used up, or it's busy. Try again in a minute." : "Couldn't read that file. Try a clearer photo." };
  }
  const c = (j.candidates || [])[0] || {}, txt = ((c.content || {}).parts || []).map(p => p.text || "").join("");
  let out = null; try { out = JSON.parse(txt); } catch (e) { const a = txt.indexOf("{"), b = txt.lastIndexOf("}"); try { out = JSON.parse(txt.slice(a, b + 1)); } catch (x) {} }
  if (!out) return { status: 502, error: c.finishReason === "MAX_TOKENS" ? "That menu is very long. Scan it one page at a time." : "Couldn't read that file. Try a clearer photo." };
  return { sections: Array.isArray(out.sections) ? out.sections : [], cut: c.finishReason === "MAX_TOKENS" };
}

async function claude(m, prompt, signal) {
  const file = m[1] === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: m[2] } }
    : { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } };
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", signal,
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: env.MENU_AI_MODEL || "claude-sonnet-5-5", max_tokens: 12000, tools: [TOOL], tool_choice: { type: "tool", name: "save_items" },
      messages: [{ role: "user", content: [file, { type: "text", text: prompt }] }] })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("scan: anthropic", r.status, j && j.error && j.error.message);
    return { status: 502, error: r.status === 401 ? "The AI key in Vercel isn't valid." : r.status === 429 || r.status === 529 ? "The scanner is busy. Try again in a minute." : "Couldn't read that file. Try a clearer photo." };
  }
  const use = (j.content || []).find(c => c.type === "tool_use");
  return { sections: (use && use.input && Array.isArray(use.input.sections)) ? use.input.sections : [], cut: j.stop_reason === "max_tokens" };
}
const enabled = () => !!(env.GEMINI_API_KEY || env.ANTHROPIC_API_KEY);

async function scan(b, user) {
  if (!enabled()) return { status: 501, error: "AI scanning isn't switched on. Add GEMINI_API_KEY in Vercel." };
  const m = /^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.data || ""));
  if (!m) return { status: 400, error: "Please upload a photo (JPG, PNG) or a PDF." };
  if (m[2].length > 4.3e6) return { status: 413, error: "That file is too large. Try a photo under 3 MB, or one page at a time." };
  // Limits so a free quota (or a bill) can't run away: per account per day, and for the whole site per day.
  const uk = "scan-n:" + user.id + ":" + day(), gk = "scan-all:" + day();
  const [u, g] = [await db.cmd("INCR", uk), await db.cmd("INCR", gk)];
  if (u === 1) await db.cmd("EXPIRE", uk, 172800); if (g === 1) await db.cmd("EXPIRE", gk, 172800);
  if (u > (+env.MENU_SCAN_PER_USER || 60)) return { status: 429, error: "You've scanned a lot today. Try again tomorrow." };
  if (g > (+env.MENU_SCAN_DAILY || 1500)) return { status: 429, error: "Scanning is busy today. Please type the items, or try tomorrow." };
  const hint = clip(b.cat, 40) ? `\nThe business type is: ${clip(b.cat, 40)}.` : "";
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 55000);
  let r;
  try { r = await (env.GEMINI_API_KEY ? gemini(m, PROMPT + hint, ac.signal) : claude(m, PROMPT + hint, ac.signal)); }
  catch (e) { return { status: 504, error: e.name === "AbortError" ? "That took too long. Try one page at a time." : "Couldn't reach the scanner. Try again." }; }
  finally { clearTimeout(t); }
  if (r.error) return r;
  const raw = r.sections;
  const sections = raw.slice(0, 30).map(s => ({
    n: clip(s && s.name, 24) || "Menu",
    items: (s && Array.isArray(s.items) ? s.items : []).slice(0, 120).map(x => ({ n: clip(x && x.name, 50), p: price(x && x.price), d: clip(x && x.desc, 140), ...(x && x.best === true ? { b: true } : {}) })).filter(x => x.n)
  })).filter(s => s.items.length);
  return { ok: true, sections, cut: !!r.cut };
}
module.exports = { scan, enabled };
