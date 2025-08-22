// server/routes/reports.js
//
// POST /api/reports/export?format=csv|xlsx|pdf
// Body: { title, meta: {...}, headers: string[], rows: Array<Object> }
// Role: admin or teacher

const express = require("express");
const { authenticate } = require("../middleware/auth");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

const router = express.Router();

router.post("/export", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "teacher") {
      return res.status(403).json({ error: "forbidden" });
    }

    const format = String(req.query.format || "csv").toLowerCase();
    const { title = "Analytics Report", meta = {}, headers = [], rows = [] } = req.body || {};

    if (!Array.isArray(headers) || !headers.length || !Array.isArray(rows)) {
      return res.status(400).json({ error: "invalid_payload" });
    }

    // CSV (fast path)
    if (format === "csv") {
      const csv = [headers.join(",")].concat(
        rows.map((r) => headers.map((h) => r[h] ?? "").join(","))
      ).join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="report.csv"`);
      return res.send(csv);
    }

    // XLSX
    if (format === "xlsx") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Analytics");

      // meta (optional) as key/value above table
      const metaKeys = Object.keys(meta || {});
      if (metaKeys.length) {
        ws.addRow([title]);
        ws.addRow([]);
        metaKeys.forEach((k) => ws.addRow([k, String(meta[k])]));
        ws.addRow([]);
      } else {
        ws.addRow([title]);
        ws.addRow([]);
      }

      ws.addRow(headers);
      rows.forEach((r) => ws.addRow(headers.map((h) => r[h] ?? "")));
      ws.columns.forEach((col) => { col.width = Math.min(40, Math.max(12, (col.header?.length || 10) + 4)); });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="report.xlsx"`);

      await wb.xlsx.write(res);
      return res.end();
    }

    // PDF (text/table; no charts)
    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="report.pdf"`);

      const doc = new PDFDocument({ margin: 36 });
      doc.pipe(res);

      doc.fontSize(16).text(title);
      doc.moveDown();

      Object.entries(meta || {}).forEach(([k, v]) => doc.fontSize(10).text(`${k}: ${v}`));
      if (Object.keys(meta || {}).length) doc.moveDown();

      // very simple tabular print
      doc.fontSize(11).text(headers.join(" | "));
      doc.moveTo(36, doc.y + 4).lineTo(559, doc.y + 4).stroke();
      rows.forEach((r) => doc.text(headers.map((h) => String(r[h] ?? "")).join(" | ")));

      doc.end();
      return; // stream ends response
    }

    return res.status(400).json({ error: "unsupported_format" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "export_failed", details: err.message });
  }
});

module.exports = router;
