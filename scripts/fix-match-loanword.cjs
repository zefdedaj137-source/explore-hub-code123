/**
 * fix-match-loanword.cjs
 * Fixes DeepL's mistranslation of "Match" (dating connection) as a sports word
 * in DE, ES, IT, NL, PL, PT locale files.
 *
 * "Match" in a dating-app context is a loanword in all these languages
 * (Tinder DE/ES/IT/NL/PL/PT all use "Match").
 *
 * Run: node scripts/fix-match-loanword.cjs
 */

const fs = require("fs");
const path = require("path");

const LOCALES = path.join(__dirname, "../src/locales");

// ── Namespace prefixes where "match" = dating connection (fix these) ─────────
const DATING_NAMESPACES = [
  "matches.",
  "matchInsights.",
  "matchGoals.",
  "home.",
  "activityFeed.",
  "notifications.",
  "compatibleMatches.",
  "bookmarks.",
  "nav.",
  "discover.",
  "whoLikedYou.",
  "premiumFeatures.",
  "settings.",
  "profile.",
  "editProfile.",
  "profileSetup.",
  "onboarding.",
  "premium.",
  "superLike.",
  "roses.",
  "ghostMode.",
  "ghostModeAlert.",
  "chat.",
  "datePlans.",
];

// ── Namespace prefixes where "match" = actual game (NEVER fix) ───────────────
const GAME_NAMESPACES = [
  "gameLobby.",
  "icebreakerGames.",
  "icebreakers.",
  "dateGames.",
  "gameSession.",
  "datingGamesComponent.",
  "games.",
];

// ── Sport-word replacements per language ──────────────────────────────────────
// Order: plural before singular so we don't partially replace
const SPORT_WORDS = {
  de: [
    // Compound words first (word boundaries don't work for compounds in German)
    ["Spieltore",      "Match-Ziele"],
    ["Spielziele",     "Match-Ziele"],
    ["Spielstatistiken", "Match-Statistiken"],
    ["Spielstatistik", "Match-Statistik"],
    ["Einblicke in das Spiel", "Match-Einblicke"],
    ["Spitzenspiele",  "Premium Matches"],
    // Standalone with word boundaries
    [/\bNeue Spiele\b/g,  "Neue Matches"],
    [/\bNeues Spiel\b/g,  "Neues Match"],
    [/\bneue Spiele\b/g,  "neue Matches"],
    [/\bneues Spiel\b/g,  "neues Match"],
    [/\bdie Spiele\b/g,   "die Matches"],
    [/\bDie Spiele\b/g,   "Die Matches"],
    [/\bder Spiele\b/g,   "der Matches"],
    [/\bden Spiele\b/g,   "den Matches"],
    [/\bdas Spiel\b/g,    "das Match"],
    [/\bDas Spiel\b/g,    "Das Match"],
    [/\bdem Spiel\b/g,    "dem Match"],
    [/\bdes Spiels\b/g,   "des Matchs"],
    [/\bein Spiel\b/g,    "ein Match"],
    [/\bein Spiel\b/gi,   "ein Match"],
    [/\bkein Spiel\b/g,   "kein Match"],
    [/\bIhr Spiel\b/g,    "Ihr Match"],
    [/\bdein Spiel\b/g,   "dein Match"],
    [/\bSpiele\b/g,       "Matches"],
    [/\bSpiel\b/g,        "Match"],
  ],
  es: [
    [/\bNuevos partidos\b/g,  "Nuevos Matches"],
    [/\bNuevo partido\b/g,    "Nuevo Match"],
    [/\bnuevos partidos\b/g,  "nuevos Matches"],
    [/\bnuevo partido\b/g,    "nuevo Match"],
    [/\bPartidos\b/g,         "Matches"],
    [/\bPartido\b/g,          "Match"],
    [/\bpartidos\b/g,         "matches"],
    [/\bpartido\b/g,          "match"],
  ],
  it: [
    [/\bNuove partite\b/g,    "Nuovi Match"],
    [/\bNuova partita\b/g,    "Nuovo Match"],
    [/\bnuove partite\b/g,    "nuovi match"],
    [/\bnuova partita\b/g,    "nuovo match"],
    [/\bPartite\b/g,          "Match"],
    [/\bPartita\b/g,          "Match"],
    [/\bpartite\b/g,          "match"],
    [/\bpartita\b/g,          "match"],
  ],
  nl: [
    [/\bNieuwe wedstrijden\b/g, "Nieuwe Matches"],
    [/\bNieuwe wedstrijd\b/g,   "Nieuwe Match"],
    [/\bnieuwe wedstrijden\b/g, "nieuwe Matches"],
    [/\bnieuwe wedstrijd\b/g,   "nieuwe Match"],
    [/\bWedstrijden\b/g,        "Matches"],
    [/\bWedstrijd\b/g,          "Match"],
    [/\bwedstrijden\b/g,        "matches"],
    [/\bwedstrijd\b/g,          "match"],
  ],
  pl: [
    [/\bNowe mecze\b/g,   "Nowe Mecze".replace("Mecze", "Matches")],
    [/\bNowy mecz\b/g,    "Nowy Match"],
    [/\bnowe mecze\b/g,   "nowe Matches"],
    [/\bnowy mecz\b/g,    "nowy Match"],
    [/\bMecze\b/g,        "Matches"],
    [/\bMecz\b/g,         "Match"],
    [/\bmecze\b/g,        "Matches"],
    [/\bmecz\b/g,         "Match"],
  ],
  pt: [
    [/\bNovas partidas\b/g,  "Novos Matches"],
    [/\bNova partida\b/g,    "Novo Match"],
    [/\bnovas partidas\b/g,  "novos Matches"],
    [/\bnova partida\b/g,    "novo Match"],
    [/\bNovos jogos\b/g,     "Novos Matches"],
    [/\bNovo jogo\b/g,       "Novo Match"],
    [/\bnovos jogos\b/g,     "novos Matches"],
    [/\bnovo jogo\b/g,       "novo Match"],
    [/\bPartidas\b/g,        "Matches"],
    [/\bPartida\b/g,         "Match"],
    [/\bpartidas\b/g,        "matches"],
    [/\bpartida\b/g,         "match"],
    [/\bJogos\b/g,           "Matches"],
    [/\bJogo\b/g,            "Match"],
    [/\bjogos\b/g,           "matches"],
    [/\bjogo\b/g,            "match"],
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = String(v ?? "");
    }
  }
  return out;
}

function setNested(obj, dotKey, value) {
  const parts = dotKey.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== "object" || cur[parts[i]] === null) {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function isDatingKey(dotKey) {
  // Top-level keys (no dot) are often navigation items — include them
  if (!dotKey.includes(".")) return true;
  if (GAME_NAMESPACES.some((ns) => dotKey.startsWith(ns))) return false;
  // Check if any dating namespace prefix matches
  if (DATING_NAMESPACES.some((ns) => dotKey.startsWith(ns))) return true;
  // Default: include (better to over-fix than under-fix)
  return true;
}

function applyFixes(value, rules) {
  let v = value;
  for (const [pattern, replacement] of rules) {
    if (typeof pattern === "string") {
      v = v.split(pattern).join(replacement);
    } else {
      v = v.replace(pattern, replacement);
    }
  }
  return v;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const en = JSON.parse(fs.readFileSync(path.join(LOCALES, "en.json"), "utf8"));
const enFlat = flatten(en);

for (const [lang, rules] of Object.entries(SPORT_WORDS)) {
  const filePath = path.join(LOCALES, `${lang}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠  ${lang}.json not found — skipping`);
    continue;
  }

  const locale = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const flat = flatten(locale);

  let fixCount = 0;
  const fixed = JSON.parse(JSON.stringify(locale)); // deep clone

  for (const key of Object.keys(flat)) {
    if (!isDatingKey(key)) continue;

    // Only fix if the English source actually uses "match" as a dating term
    const enVal = enFlat[key];
    if (!enVal || !/\bmatch(es)?\b/i.test(enVal)) continue;

    const original = flat[key];
    const updated = applyFixes(original, rules);

    if (updated !== original) {
      setNested(fixed, key, updated);
      fixCount++;
      console.log(`  ${lang} [${key}]`);
      console.log(`    "${original}"`);
      console.log(`    → "${updated}"`);
    }
  }

  if (fixCount > 0) {
    fs.writeFileSync(filePath, JSON.stringify(fixed, null, 2) + "\n", "utf8");
    console.log(`✓ ${lang}.json — fixed ${fixCount} strings\n`);
  } else {
    console.log(`✓ ${lang}.json — nothing to fix\n`);
  }
}

console.log("✅  Done!");
