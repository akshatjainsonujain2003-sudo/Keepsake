// Business page stats: daily opens and taps (Call, WhatsApp, Directions…), kept for 40 days.
// bzv:<id>:<day>          = opens that day
// bze:<id>:<tap>:<day>    = people who tapped (one per person per day)
const db = require("./_db");
const TAPS = ["call", "wa", "dir", "ig", "pay", "review", "order"];
const KEEP = 40 * 86400;
const day = (t = Date.now()) => new Date(t + 5.5 * 3600e3).toISOString().slice(0, 10); // India time
const lastDays = n => Array.from({ length: n }, (_, i) => day(Date.now() - (n - 1 - i) * 864e5));

async function view(id) { const k = "bzv:" + id + ":" + day(); if ((await db.cmd("INCR", k)) === 1) await db.cmd("EXPIRE", k, KEEP); }
async function tap(id, t, who) {
  if (!TAPS.includes(t)) return false;
  const d = day(), once = "bzd:" + id + ":" + t + ":" + d + ":" + String(who || "").slice(0, 64);
  if ((await db.cmd("SET", once, "1", "NX", "EX", 86400)) !== "OK") return true; // already counted this person today
  const k = "bze:" + id + ":" + t + ":" + d; if ((await db.cmd("INCR", k)) === 1) await db.cmd("EXPIRE", k, KEEP);
  return true;
}
// { days:[{d,v}], week, prevWeek, taps:{call:n,…} } for the last 7 days (plus the week before, for comparison)
async function week(id) {
  const days = lastDays(14), keys = days.map(d => "bzv:" + id + ":" + d).concat(TAPS.flatMap(t => days.slice(7).map(d => "bze:" + id + ":" + t + ":" + d)));
  const v = (await db.cmd("MGET", ...keys)).map(x => +x || 0);
  const opens = v.slice(0, 14), taps = {};
  TAPS.forEach((t, i) => taps[t] = v.slice(14 + i * 7, 14 + i * 7 + 7).reduce((a, b) => a + b, 0));
  return { days: days.slice(7).map((d, i) => ({ d, v: opens[7 + i] })), week: opens.slice(7).reduce((a, b) => a + b, 0), prevWeek: opens.slice(0, 7).reduce((a, b) => a + b, 0), taps };
}
module.exports = { view, tap, week, TAPS, day };
