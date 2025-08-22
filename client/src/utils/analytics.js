// Shared helpers for Analytics/Reports pages

export const COLORS = {
  lessons: "#1976d2",
  approvals: "#2e7d32",
  attendance: "#f57c00",
  rating: "#6a1b9a",
};

export const PIE_COLORS = [
  "#90caf9",
  "#a5d6a7",
  "#ffe082",
  "#ef9a9a",
  "#b39ddb",
  "#80cbc4",
];

/**
 * Merge server series into a single array keyed by bucket (day/week/month).
 * Safe against missing series; sorts by bucket.
 */
export function mergeSeries(series = {}) {
  const map = new Map();
  const put = (arr = [], key) => {
    arr.forEach((p) => {
      const k = p._id;
      const row = map.get(k) || { bucket: k };
      row[key] = p.count ?? p.rate ?? p.avg ?? 0;
      map.set(k, row);
    });
  };
  put(series.lessons, "lessons");
  put(series.approvals, "approvals");
  put(series.attendanceRate, "attendance");
  put(series.avgRating, "rating");
  return Array.from(map.values()).sort((a, b) =>
    String(a.bucket).localeCompare(String(b.bucket)),
  );
}

export function tooltipValueFormatter(value, name) {
  if (!name) return value;
  const n = name.toLowerCase();
  if (n.includes("attendance"))
    return [`${Math.round((value ?? 0) * 100)}%`, "Attendance"];
  if (n.includes("rating"))
    return [Number(value ?? 0).toFixed(1), "Avg Rating"];
  return [Number(value ?? 0), name];
}

export function rowsToCsv(rows) {
  const header = [
    "bucket",
    "lessons",
    "approvals",
    "attendance_pct",
    "avg_rating",
  ];
  const lines = [header.join(",")];
  (rows || []).forEach((r) => {
    const attPct = r.attendance != null ? Math.round(r.attendance * 100) : "";
    const rating = r.rating != null ? Number(r.rating).toFixed(1) : "";
    lines.push(
      [r.bucket, r.lessons ?? "", r.approvals ?? "", attPct, rating].join(","),
    );
  });
  return lines.join("\n");
}
