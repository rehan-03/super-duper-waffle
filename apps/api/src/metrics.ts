const samples: { elapsedMs: number; failed: boolean }[] = [];
let requests = 0,
  errors = 0;
export function recordRequest(elapsedMs: number, status: number) {
  requests++;
  if (status >= 500) errors++;
  samples.push({ elapsedMs, failed: status >= 500 });
  if (samples.length > 1000) samples.shift();
}
export function requestMetrics() {
  const sorted = samples.map((s) => s.elapsedMs).sort((a, b) => a - b);
  return {
    requestsSinceStart: requests,
    serverErrorsSinceStart: errors,
    recentSampleCount: sorted.length,
    recentP95Ms: sorted.length
      ? Math.round(sorted[Math.ceil(sorted.length * 0.95) - 1]!)
      : null,
  };
}
