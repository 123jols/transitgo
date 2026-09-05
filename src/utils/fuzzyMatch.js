// Small, dependency-free fuzzy string matching — used to tolerate typos and
// partial phrasing ("jmall", "sto nino", "ayala mall") when resolving a
// rider's (or AI-extracted) destination text against TransitGo's real,
// verified place names. This never invents a match: callers apply a
// threshold and treat "nothing scored high enough" as "not found," rather
// than always returning some best-effort guess.

function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // strip accents (e.g. "Niño" -> "nino")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Levenshtein edit distance — standard DP implementation, small inputs only
// (place names, not paragraphs), so the O(n*m) table is never a concern here.
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const row = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = row;
  }
  return prev[n];
}

// 0..1 similarity between a query and a candidate label, taking the best of:
// - substring containment (handles "ayala" matching "Ayala Center Cebu")
// - whole-string edit distance (handles minor typos on short names)
// - best per-token edit distance (handles "sm" matching one word of "SM City Cebu")
export function similarity(query, candidate) {
  const q = normalize(query);
  const c = normalize(candidate);
  if (!q || !c) return 0;
  if (c === q) return 1;

  let best = 0;

  if (c.includes(q) || q.includes(c)) {
    best = Math.max(best, 0.85 + 0.15 * (Math.min(q.length, c.length) / Math.max(q.length, c.length)));
  }

  const wholeDist = levenshtein(q, c);
  best = Math.max(best, 1 - wholeDist / Math.max(q.length, c.length));

  const cTokens = c.split(" ").filter(Boolean);
  for (const token of cTokens) {
    const dist = levenshtein(q, token);
    const tokenSim = 1 - dist / Math.max(q.length, token.length);
    best = Math.max(best, tokenSim * 0.95); // slight discount vs. a full-string match
  }

  // Token-set comparison: also split the QUERY into words (not just the
  // candidate) and match each query word against its best-fitting candidate
  // word. Handles common local abbreviations the whole-string/single-token
  // checks above miss — e.g. "sto nino" -> "Basilica del Santo Niño" isn't a
  // substring match (spelled differently) and is too short relative to the
  // full candidate name for a whole-string edit distance to score well, but
  // "sto"~"santo" and "nino"~"niño" both score well word-for-word.
  const qTokens = q.split(" ").filter(Boolean);
  if (qTokens.length > 1 && cTokens.length > 0) {
    const perTokenBest = qTokens.map((qt) =>
      Math.max(...cTokens.map((ct) => 1 - levenshtein(qt, ct) / Math.max(qt.length, ct.length)))
    );
    const avg = perTokenBest.reduce((sum, s) => sum + s, 0) / perTokenBest.length;
    // Plain averaging lets generic shared words ("SM", "City", "Cebu") carry
    // a query past a genuinely distinguishing word it got wrong — "SM
    // Seaside City Cebu" would otherwise score high against "SM City Cebu
    // Terminal" (a real, different mall) on the strength of 3 shared tokens
    // alone. Multiplying by the worst-scoring token means one badly-matched
    // word meaningfully drags the score down instead of being outvoted.
    const worst = Math.min(...perTokenBest);
    const combined = avg * (0.5 + 0.5 * worst);
    best = Math.max(best, combined * 0.95);
  }

  return Math.max(0, Math.min(1, best));
}

// Ranks `items` (each with a `label`) against `query`, keeping only matches
// at or above `threshold`, best first. Pure/generic — no TransitGo-specific
// knowledge lives here; see src/api/transit.js's resolveDestinationCandidates
// for the actual place-list wiring.
export function rankBySimilarity(items, query, { threshold = 0.55, getLabel = (x) => x.label } = {}) {
  return items
    .map((item) => ({ item, score: similarity(query, getLabel(item)) }))
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score);
}
