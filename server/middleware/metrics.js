const metrics = {
  requests: 0,
  paths: {},
  timings: []
};

function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    metrics.requests++;
    metrics.paths[req.path] = (metrics.paths[req.path] || 0) + 1;
    const dur = Number(process.hrtime.bigint() - start) / 1e6; // ms
    metrics.timings.push(dur);
    if (metrics.timings.length > 1000) metrics.timings.shift();
  });
  next();
}

function metricsRoute(req, res) {
  const times = metrics.timings.slice();
  times.sort((a,b)=>a-b);
  const p = (q)=> times.length? times[Math.floor(q*times.length)] : 0;
  res.json({
    requests: metrics.requests,
    topPaths: Object.entries(metrics.paths).sort((a,b)=>b[1]-a[1]).slice(0,10),
    p50_ms: p(0.50), p90_ms: p(0.90), p99_ms: p(0.99)
  });
}

module.exports = { metricsMiddleware, metricsRoute };
