(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MMQMath = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randInt(min, max, rng = Math.random) {
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  function choice(items, rng = Math.random) {
    return items[Math.floor(rng() * items.length)];
  }

  function shuffle(items, rng = Math.random) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function metrics(correct, attempts, seconds) {
    const safeAttempts = Math.max(0, Number(attempts) || 0);
    const safeCorrect = clamp(Math.max(0, Number(correct) || 0), 0, safeAttempts);
    const safeSeconds = Math.max(1, Number(seconds) || 1);
    const minutes = safeSeconds / 60;
    const attemptRate = safeAttempts / minutes;
    const accuracy = safeAttempts ? safeCorrect / safeAttempts : 0;
    const fluency = attemptRate * accuracy;
    return {
      attemptRate,
      accuracy,
      accuracyPercent: accuracy * 100,
      fluency
    };
  }

  function completedLines(selectedIndexes, size = 5) {
    const set = selectedIndexes instanceof Set ? selectedIndexes : new Set(selectedIndexes || []);
    const lines = [];
    for (let r = 0; r < size; r += 1) {
      let ok = true;
      for (let c = 0; c < size; c += 1) {
        if (!set.has(r * size + c)) { ok = false; break; }
      }
      if (ok) lines.push(`row-${r}`);
    }
    for (let c = 0; c < size; c += 1) {
      let ok = true;
      for (let r = 0; r < size; r += 1) {
        if (!set.has(r * size + c)) { ok = false; break; }
      }
      if (ok) lines.push(`col-${c}`);
    }
    return lines;
  }

  function productDistractors(correct, table, count = 3, rng = Math.random) {
    const target = Number(correct);
    const t = Math.max(2, Number(table) || 2);
    const pool = [];
    for (let m = 1; m <= 10; m += 1) {
      const v = t * m;
      if (v !== target) pool.push(v);
    }
    for (let delta = 1; delta <= 8; delta += 1) {
      if (target - delta > 0) pool.push(target - delta);
      pool.push(target + delta);
    }
    const unique = Array.from(new Set(pool.filter(v => v > 0 && v !== target)));
    return shuffle(unique, rng).slice(0, count);
  }


  function multiplicationDistractors(a, b, count = 3, rng = Math.random) {
    const left = Math.max(1, Number(a) || 1);
    const right = Math.max(2, Number(b) || 2);
    const answer = left * right;
    const candidates = [
      (left - 1) * right,
      (left + 1) * right,
      left * (right - 1),
      left * (right + 1),
      left + right,
      answer - left,
      answer + left,
      answer - right,
      answer + right
    ].filter(v => Number.isFinite(v) && v > 0 && v !== answer);
    const unique = Array.from(new Set(candidates));
    let delta = 1;
    while (unique.length < count) {
      [answer - delta, answer + delta].forEach(v => {
        if (v > 0 && v !== answer && !unique.includes(v)) unique.push(v);
      });
      delta += 1;
    }
    return shuffle(unique, rng).slice(0, count);
  }

  function tableFacts(tables, maxMultiplier = 9) {
    const safeTables = Array.from(new Set((tables || []).map(Number).filter(n => n >= 2 && n <= 10)));
    const facts = [];
    safeTables.forEach(table => {
      for (let a = 1; a <= maxMultiplier; a += 1) {
        facts.push({ a, b: table, product: a * table });
      }
    });
    return facts;
  }

  return { clamp, randInt, choice, shuffle, metrics, completedLines, productDistractors, multiplicationDistractors, tableFacts };
});
