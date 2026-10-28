/* GST reports for a shop's CA, built from one month of Keepsake bills. Browser (window.KSGSTX) and Node (require).
   Sheets follow the GSTR-1 offline tool: b2b, b2cl, b2cs, exemp, hsn(b2b), hsn(b2c), docs, plus a sales register
   and a GSTR-3B summary. Cancelled bills appear in the register and in "docs" but not in the tax sections.
   B2CL = inter-state sale to an unregistered buyer with invoice value above ₹1,00,000 (from 1 Aug 2024). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./gst.v1.js"));
  else root.KSGSTX = factory(root.KSGST);
})(typeof self !== "undefined" ? self : this, function (G) {
  const B2CL_MIN = 100000;
  const r2 = G.r2;
  const UQCL = { NOS: "NOS-NUMBERS", PCS: "PCS-PIECES", SET: "SET-SETS", PRS: "PRS-PAIRS", KGS: "KGS-KILOGRAMS", GMS: "GMS-GRAMMES", LTR: "LTR-LITRES", MLT: "MLT-MILILITRE", MTR: "MTR-METERS", BOX: "BOX-BOX", PAC: "PAC-PACKS", DOZ: "DOZ-DOZENS", BTL: "BTL-BOTTLES", NA: "NA", OTH: "OTH-OTHERS" };
  const pos = c => c + "-" + (G.STATES[c] || "");
  const sum = (xs, f) => r2(xs.reduce((t, x) => t + (+f(x) || 0), 0));

  // Per-rate totals of one bill (from its rounded lines, so they add up to the bill).
  function byRate(b) {
    const m = {};
    for (const x of b.calc.lines) { const k = m[x.r] = m[x.r] || { r: x.r, tv: 0, c: 0, s: 0, i: 0 }; k.tv += x.tv; k.c += x.c; k.s += x.s; k.i += x.i; }
    return Object.values(m).map(k => ({ r: k.r, tv: r2(k.tv), c: r2(k.c), s: r2(k.s), i: r2(k.i) })).sort((a, b) => a.r - b.r);
  }

  function build(bills, shop) {
    bills = (bills || []).slice().sort((a, b) => a.at - b.at);
    const live = bills.filter(b => !b.cancel), tax = live.filter(b => b.kind === "tax");
    const H = {
      register: ["Date", "Invoice No.", "Type", "Customer", "Phone", "Customer GSTIN", "Place of supply", "Taxable value", "CGST", "SGST", "IGST", "Round off", "Invoice total", "Payment", "Status"],
      b2b: ["GSTIN/UIN of Recipient", "Receiver Name", "Invoice Number", "Invoice date", "Invoice Value", "Place Of Supply", "Reverse Charge", "Applicable % of Tax Rate", "Invoice Type", "E-Commerce GSTIN", "Rate", "Taxable Value", "Cess Amount"],
      b2cl: ["Invoice Number", "Invoice date", "Invoice Value", "Place Of Supply", "Applicable % of Tax Rate", "Rate", "Taxable Value", "Cess Amount", "E-Commerce GSTIN"],
      b2cs: ["Type", "Place Of Supply", "Applicable % of Tax Rate", "Rate", "Taxable Value", "Cess Amount", "E-Commerce GSTIN"],
      exemp: ["Description", "Nil Rated Supplies", "Exempted(other than nil rated/non GST supply)", "Non-GST Supplies"],
      hsn: ["HSN", "Description", "UQC", "Total Quantity", "Total Value", "Rate", "Taxable Value", "Integrated Tax Amount", "Central Tax Amount", "State/UT Tax Amount", "Cess Amount"],
      docs: ["Nature of Document", "Sr. No. From", "Sr. No. To", "Total Number", "Cancelled"]
    };
    const register = bills.map(b => [G.dmy(b.at), b.no, b.kind === "tax" ? "Tax invoice" : "Bill of supply", b.cust.name || "Walk-in customer", b.cust.phone || "", b.cust.gstin || "", b.kind === "tax" ? pos(b.calc.pos) : "",
      b.calc.taxable, b.calc.cgst, b.calc.sgst, b.calc.igst, b.calc.roff, b.calc.total, b.cancel ? "" : b.paid ? "Paid" + (b.pmode ? " (" + b.pmode + ")" : "") : "Unpaid", b.cancel ? "Cancelled" : "Active"]);
    const rTot = ["", "", "", "Total (active bills)", "", "", "", sum(live, b => b.calc.taxable), sum(live, b => b.calc.cgst), sum(live, b => b.calc.sgst), sum(live, b => b.calc.igst), sum(live, b => b.calc.roff), sum(live, b => b.calc.total), "", ""];

    const b2b = [], b2cl = [], b2csM = {}, exemp = { ir: 0, ar: 0, iu: 0, au: 0 }, hsnM = { b2b: {}, b2c: {} };
    for (const b of tax) {
      const reg = !!b.cust.gstin, inter = !b.calc.intra, rates = byRate(b);
      const large = !reg && inter && b.calc.total > B2CL_MIN;
      for (const k of rates) {
        if (k.r === 0) { exemp[(inter ? "i" : "a") + (reg ? "r" : "u")] += k.tv; continue; }
        if (reg) b2b.push([b.cust.gstin, b.cust.name, b.no, G.dmy(b.at), b.calc.total, pos(b.calc.pos), "N", "", "Regular B2B", "", k.r, k.tv, 0]);
        else if (large) b2cl.push([b.no, G.dmy(b.at), b.calc.total, pos(b.calc.pos), "", k.r, k.tv, 0, ""]);
        else { const key = b.calc.pos + "|" + k.r, g = b2csM[key] = b2csM[key] || { p: b.calc.pos, r: k.r, tv: 0 }; g.tv += k.tv; }
      }
      for (const x of b.calc.lines) {
        const M = hsnM[reg ? "b2b" : "b2c"], key = x.hsn + "|" + x.u + "|" + x.r, h = M[key] = M[key] || { hsn: x.hsn, d: x.n, u: x.u, r: x.r, q: 0, tv: 0, c: 0, s: 0, i: 0 };
        h.q += x.q; h.tv += x.tv; h.c += x.c; h.s += x.s; h.i += x.i;
      }
    }
    const b2cs = Object.values(b2csM).sort((a, b) => a.p.localeCompare(b.p) || a.r - b.r).map(g => ["OE", pos(g.p), "", g.r, r2(g.tv), 0, ""]);
    const exempRows = [["Inter-State supplies to registered persons", r2(exemp.ir), 0, 0], ["Intra-State supplies to registered persons", r2(exemp.ar), 0, 0], ["Inter-State supplies to unregistered persons", r2(exemp.iu), 0, 0], ["Intra-State supplies to unregistered persons", r2(exemp.au), 0, 0]];
    const hsnRows = M => Object.values(M).sort((a, b) => a.hsn.localeCompare(b.hsn) || a.r - b.r).map(h => [h.hsn, h.d, UQCL[h.u] || h.u, Math.round(h.q * 1000) / 1000, r2(h.tv + h.c + h.s + h.i), h.r, r2(h.tv), r2(h.i), r2(h.c), r2(h.s), 0]);

    // Table 13: one row per invoice series (prefix + financial year), cancelled ones included.
    const series = {};
    for (const b of bills) { const p = b.no.replace(/\d+$/, ""), n = +b.no.slice(p.length), s = series[p] = series[p] || { k: b.kind, min: [n, b.no], max: [n, b.no], tot: 0, cx: 0 }; if (n < s.min[0]) s.min = [n, b.no]; if (n > s.max[0]) s.max = [n, b.no]; s.tot++; if (b.cancel) s.cx++; }
    const docs = Object.values(series).map(s => [s.k === "tax" ? "Invoices for outward supply" : "Bill of supply", s.min[1], s.max[1], s.tot, s.cx]);

    // GSTR-3B: 3.1(a) taxable outward supplies, 3.1(c) nil rated, 3.2 inter-state supplies to unregistered persons.
    const pos0 = tax.flatMap(b => byRate(b).map(k => ({ b, k })));
    const taxed = pos0.filter(x => x.k.r > 0), nil = pos0.filter(x => x.k.r === 0);
    const s3b = {
      a: { tv: sum(taxed, x => x.k.tv), i: sum(taxed, x => x.k.i), c: sum(taxed, x => x.k.c), s: sum(taxed, x => x.k.s) },
      nil: sum(nil, x => x.k.tv),
      unreg: Object.values(taxed.filter(x => !x.b.cust.gstin && !x.b.calc.intra).reduce((m, x) => { const g = m[x.b.calc.pos] = m[x.b.calc.pos] || { p: x.b.calc.pos, tv: 0, i: 0 }; g.tv += x.k.tv; g.i += x.k.i; return m; }, {})).map(g => ({ pos: pos(g.p), tv: r2(g.tv), i: r2(g.i) }))
    };
    return {
      H, s3b, count: { all: bills.length, live: live.length, cancelled: bills.length - live.length, b2b: new Set(b2b.map(r => r[2])).size, b2cl: new Set(b2cl.map(r => r[0])).size },
      sheets: [
        { name: "Sales register", rows: [H.register, ...register, rTot] },
        ...(tax.length || bills.some(b => b.kind === "tax") ? [
          { name: "b2b", rows: [H.b2b, ...b2b] }, { name: "b2cl", rows: [H.b2cl, ...b2cl] }, { name: "b2cs", rows: [H.b2cs, ...b2cs] },
          { name: "exemp", rows: [H.exemp, ...exempRows] }, { name: "hsn(b2b)", rows: [H.hsn, ...hsnRows(hsnM.b2b)] }, { name: "hsn(b2c)", rows: [H.hsn, ...hsnRows(hsnM.b2c)] },
          { name: "GSTR-3B summary", rows: [["Table", "Nature of supplies", "Place of supply", "Taxable value", "Integrated tax", "Central tax", "State/UT tax", "Cess"],
            ["3.1(a)", "Outward taxable supplies (other than zero rated, nil rated and exempted)", "", s3b.a.tv, s3b.a.i, s3b.a.c, s3b.a.s, 0],
            ["3.1(c)", "Other outward supplies (nil rated, exempted)", "", s3b.nil, 0, 0, 0, 0],
            ...s3b.unreg.map(u => ["3.2", "Inter-state supplies to unregistered persons", u.pos, u.tv, u.i, "", "", ""])] }
        ] : []),
        { name: "docs", rows: [H.docs, ...docs] },
        { name: "About", rows: [["Shop", shop && shop.name || ""], ["Legal name", shop && shop.legal || ""], ["GSTIN", shop && shop.gstin || ""], ["Bills", bills.length], ["Cancelled", bills.length - live.length], ["Made with", "GetKeepsake GST bills"], ["Note", "Nil-rated (0%) lines are shown under exemp. Move them to Exempted if they are exempt supplies. Check every figure before filing."]] }
      ]
    };
  }

  // ---------- files ----------
  const csvCell = v => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = rows => "﻿" + rows.map(r => r.map(csvCell).join(",")).join("\r\n");

  // A small .xlsx writer (stored zip, no compression): numbers stay numbers, text stays text.
  const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u => { let c = 0xffffffff; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const enc = s => new TextEncoder().encode(s);
  const xesc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  const col = i => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  function sheetXml(rows) {
    const body = rows.map((r, ri) => `<row r="${ri + 1}">` + r.map((v, ci) => {
      const ref = col(ci) + (ri + 1);
      if (typeof v === "number" && isFinite(v)) return `<c r="${ref}"${ri === 0 ? ' s="1"' : ""}><v>${v}</v></c>`;
      if (v == null || v === "") return "";
      return `<c r="${ref}" t="inlineStr"${ri === 0 ? ' s="1"' : ""}><is><t xml:space="preserve">${xesc(v)}</t></is></c>`;
    }).join("") + `</row>`).join("");
    const widths = (rows[0] || []).map((_, ci) => Math.min(48, Math.max(10, ...rows.slice(0, 200).map(r => String(r[ci] == null ? "" : r[ci]).length + 2))));
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${body}</sheetData></worksheet>`;
  }
  function zip(files) {
    const parts = [], dir = []; let off = 0;
    const u16 = n => [n & 255, (n >>> 8) & 255], u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
    for (const f of files) {
      const name = enc(f.name), data = enc(f.data), c = crc32(data);
      const head = [0x50, 0x4b, 3, 4, ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x21), ...u32(c), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)];
      parts.push(new Uint8Array(head), name, data);
      dir.push([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x21), ...u32(c), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)], name);
      off += head.length + name.length + data.length;
    }
    const cd = dir.map(d => d instanceof Uint8Array ? d : new Uint8Array(d)), cdLen = cd.reduce((t, d) => t + d.length, 0);
    const end = new Uint8Array([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdLen), ...u32(off), ...u16(0)]);
    const all = [...parts, ...cd, end], out = new Uint8Array(all.reduce((t, p) => t + p.length, 0)); let p = 0;
    for (const a of all) { out.set(a, p); p += a.length; }
    return out;
  }
  function xlsx(sheets) {
    const S = sheets.map((s, i) => ({ ...s, id: i + 1, name: s.name.replace(/[\[\]:*?\/\\]/g, "").slice(0, 31) }));
    return zip([
      { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${S.map(s => `<Override PartName="/xl/worksheets/sheet${s.id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
      { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${S.map(s => `<sheet name="${xesc(s.name)}" sheetId="${s.id}" r:id="rId${s.id}"/>`).join("")}</sheets></workbook>` },
      { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${S.map(s => `<Relationship Id="rId${s.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${s.id}.xml"/>`).join("")}<Relationship Id="rId${S.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: "xl/styles.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>` },
      ...S.map(s => ({ name: `xl/worksheets/sheet${s.id}.xml`, data: sheetXml(s.rows) }))
    ]);
  }
  function download(name, data, type) {
    const blob = new Blob([data], { type }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  const fname = (shop, ym, what) => String((shop && shop.name) || "Shop").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") + "_" + what + "_" + ym;
  return {
    build, csv, xlsx, B2CL_MIN, UQCL,
    downloadWorkbook: (bills, shop, ym) => download(fname(shop, ym, "GST") + ".xlsx", xlsx(build(bills, shop).sheets), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    downloadRegister: (bills, shop, ym) => download(fname(shop, ym, "Sales-register") + ".csv", csv(build(bills, shop).sheets[0].rows), "text/csv;charset=utf-8")
  };
});
