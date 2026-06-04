import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { IMG, UP_SPR, PRESS_SPR, COVER_SPR } from "./assets";
import cloverImg from "./charms/clover.png";
import horseshoeImg from "./charms/horseshoe.png";
import rabbitImg from "./charms/rabbit.png";
import reelStopUrl from "./audio/reelstop.wav";
import clickUrl from "./audio/click.wav";
import table0 from "./img/tables/level_0.png";
import table1 from "./img/tables/level_1.png";
import table2 from "./img/tables/level_2.png";
import table3 from "./img/tables/level_3.png";
import table4 from "./img/tables/level_4.png";
import table5 from "./img/tables/level_5.png";
import table6 from "./img/tables/level_6.png";
import table7 from "./img/tables/level_7.png";
const TABLES = [table0, table1, table2, table3, table4, table5, table6, table7];

/* ============================================================
   ONE MORE PULL — machine à sous narrative. Une pièce → un empire.
   Argent fictif, aucun paiement réel.
   Symboles, table de gains, Cash/Net Worth, achats +
   revente, revenu passif, sauvegarde. Skull/Crack = effets punitifs sur 2 ou 3 alignes.
   ============================================================ */

// ===== Géométrie de la machine (calée sur l'image, NE PAS toucher) =====
const LEV_UP = { left: 84.253, top: 26.211, w: 15.747, h: 35.263 };
const LEV_DOWN = { left: 85.977, top: 45.263, w: 13.793, h: 18.421 };
const LEV_COVER = { left: 88.506, top: 34.737, w: 8.966, h: 17.368 };   // boule + bras, calque pivotant
const RATIO = 870 / 950;
const WIN_TOP = 31.043, WIN_H = 31.077;
const VIS_TOP = 33.133, VIS_H = 28.987;
const REELS = [
  { l: 22.574, w: 16.025 },
  { l: 41.495, w: 16.496 },
  { l: 60.700, w: 16.496 },
];

// ===== Symboles gravés (monochrome, __C__ = couleur injectée) =====
const SHAPES = {
  coin:  '<circle cx="50" cy="50" r="36" fill="none" stroke="__C__" stroke-width="6"/><circle cx="50" cy="50" r="22" fill="none" stroke="__C__" stroke-width="3"/><circle cx="50" cy="50" r="7" fill="__C__"/>',
  star:  '<path d="M50 7 L61.8 38.2 L95 39 L68.5 59.6 L78.5 91.5 L50 72.5 L21.5 91.5 L31.5 59.6 L5 39 L38.2 38.2 Z" fill="__C__"/>',
  house: '<path d="M50 14 L88 46 H78 V86 H22 V46 H12 Z" fill="__C__"/><rect x="42" y="60" width="16" height="26" fill="#fff"/>',
  diamond: '<path d="M30 16 H70 L88 40 L50 92 L12 40 Z" fill="none" stroke="__C__" stroke-width="6" stroke-linejoin="round"/><path d="M12 40 H88 M30 16 L50 40 L70 16 M12 40 L50 92 M50 40 L50 92" fill="none" stroke="__C__" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>',
  crown: '<path d="M14 68 L22 26 L38 46 L50 20 L62 46 L78 26 L86 68 Z" fill="__C__"/><rect x="14" y="70" width="72" height="10" fill="__C__"/>',
  bolt:  '<path d="M58 6 L24 56 H46 L40 94 L78 40 H54 Z" fill="__C__"/>',
  eye:   '<path d="M6 50 Q50 18 94 50 Q50 82 6 50 Z" fill="none" stroke="__C__" stroke-width="6"/><circle cx="50" cy="50" r="13" fill="__C__"/>',
  joker: '<path d="M50 6 L58 42 L94 50 L58 58 L50 94 L42 58 L6 50 L42 42 Z" fill="__C__"/>',
  skull: '<path d="M50 12 C31 12 19 27 19 45 C19 57 25 64 31 68 V78 C31 84 36 88 42 88 H58 C64 88 69 84 69 78 V68 C75 64 81 57 81 45 C81 27 69 12 50 12 Z" fill="__C__"/><circle cx="37" cy="47" r="8" fill="#fff"/><circle cx="63" cy="47" r="8" fill="#fff"/><path d="M50 56 L45 67 H55 Z" fill="#fff"/>',
  crack: '<path d="M50 8 L42 34 L58 42 L44 64 L56 70 L46 94" fill="none" stroke="__C__" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>',
};
function symSVG(k, color) {
  const inner = SHAPES[k].split("__C__").join(color);
  return "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + inner + '</svg>');
}
const KEYS = Object.keys(SHAPES);
const URI = {}, URI_F = {};
KEYS.forEach((k) => { URI[k] = symSVG(k, "#141414"); URI_F[k] = symSVG(k, "#707070"); });
function Ink({ k, size, faint }) {
  return <img src={(faint ? URI_F : URI)[k]} width={size} height={size} alt="" draggable={false} style={{ display: "block" }} />;
}
// Decoupe une string sur les marqueurs **gras** et rend les segments alternes en bold
function boldMarks(s) {
  if (!s || typeof s !== "string") return s;
  const parts = s.split("**");
  return parts.map((p, i) => (i % 2 === 1 ? <b key={i} className="lc-bold">{p}</b> : <React.Fragment key={i}>{p}</React.Fragment>));
}
const SYM_NAME = { coin: "Coin", star: "Star", house: "House", diamond: "Diamond", crown: "Crown", bolt: "Bolt", eye: "Eye", joker: "Joker", skull: "Skull", crack: "Crack" };
const SYM_INFO = {
  fr: [
    ["coin",  "gain de base"],
    ["star",  "chance — gain supérieur"],
    ["house", "patrimoine"],
    ["diamond", "luxe — pierre précieuse"],
    ["crown", "revanche — **gros gain** (cartes REPULL max 3)"],
    ["bolt",  "machine (cartes HOLD max 9)"],
    ["eye",   "prédiction (cartes NUDGE max 9)"],
    ["joker", "WILD — remplace n'importe quel symbole · 3 = **jackpot**"],
    ["skull", "DANGER — 2 alignés = **-50% cash** · 3 alignés = **ruine totale**"],
    ["crack", "DANGER — 2 alignés = **-25% cash** · 3 alignés = **fin de partie**"],
  ],
  en: [
    ["coin",  "base payout"],
    ["star",  "luck — higher payout"],
    ["house", "wealth"],
    ["diamond", "luxury — precious stone"],
    ["crown", "revenge — **big win** (REPULL cards max 3)"],
    ["bolt",  "machine (HOLD cards max 9)"],
    ["eye",   "prediction (NUDGE cards max 9)"],
    ["joker", "WILD — replaces any symbol · 3 = **jackpot**"],
    ["skull", "DANGER — 2 aligned = **-50% cash** · 3 aligned = **total ruin**"],
    ["crack", "DANGER — 2 aligned = **-25% cash** · 3 aligned = **game over**"],
  ],
};

// ===== Table de gains (multiplicateurs de mise) =====
// 3 identiques (triple pur, sans joker) :
const PAY3 = { coin: 13, star: 18, house: 25, diamond: 40, crown: 110, bolt: 18, eye: 22, joker: 140 };
// 2 identiques sans joker (paire) : ratio bas pour creer un palier 'remboursement' (coin paye 1x = refund pur)
const PAY2 = { coin: 1, star: 3, house: 5, diamond: 6, crown: 14, bolt: 3, eye: 3 };
// Paire completee par 1 joker : paye 70% du triple (palier intermediaire entre paire et triple pur)
const PAY_JC_MULT = 0.7;
const NEG = { skull: true, crack: true };           // symboles "danger"
const PAY_ROW = ["coin", "star", "house", "diamond", "crown", "bolt", "eye"]; // affichés dans la mini-table

function evaluate(t) {
  const jokers = t.filter((s) => s === "joker").length;
  const non = t.filter((s) => s !== "joker");
  if (jokers === 3) return { kind: 3, sym: "joker", mult: PAY3.joker };
  const f = {}; non.forEach((s) => { f[s] = (f[s] || 0) + 1; });
  const ent = Object.entries(f).sort((a, b) => b[1] - a[1]);
  const [topSym, topCnt] = ent[0];
  // Skull / Crack : 2 ou 3 alignes declenchent un effet punitif (le joker ne les complete pas)
  if (NEG[topSym] && topCnt >= 2) return { kind: -1, sym: topSym, count: topCnt };
  // 3 identiques : triple pur = PAY3 plein, paire+joker = PAY3 * 0.7 (palier intermediaire)
  if (topCnt + jokers >= 3 && !NEG[topSym]) {
    const mult = jokers > 0 ? PAY3[topSym] * PAY_JC_MULT : PAY3[topSym];
    return { kind: 3, sym: topSym, mult };
  }
  // paire positive
  if (topCnt === 2 && !NEG[topSym]) return { kind: 2, sym: topSym, mult: PAY2[topSym] };
  return { kind: 0 };
}

// ===== Économie =====
const SAVE_KEY = "lastcoin.v2";
const BEST_KEY = "lastcoin.best";   // record persiste entre les runs (survit a newGame)
function loadBest() { try { const r = localStorage.getItem(BEST_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
const BET_STEPS = (() => { const out = []; for (let e = 0; e <= 12; e++) for (const u of [1, 2, 5]) out.push(u * 10 ** e); return out; })();
function fmt(n) {
  n = Math.round(n);
  const a = Math.abs(n);
  if (a < 1000) return n + "$";
  for (const [s, v] of [["T", 1e12], ["B", 1e9], ["M", 1e6], ["K", 1e3]]) {
    if (a >= v) { const x = n / v; return (Math.abs(x) >= 100 ? Math.round(x) : +x.toFixed(1)) + s + "$"; }
  }
  return n + "$";
}
// chance de gain constante : la mise et les multiplicateurs n'agissent plus selon le cash
const luck = () => 1;
// avarice : au-dela de 10K la machine rabote les gains. Progression plus dure en mid/end game.
// la PROBABILITE de gain reste inchangee, seul le MONTANT paye baisse.
const cashScale = (nw) =>
  nw >= 5e6 ? 0.35
  : nw >= 1e6 ? 0.45
  : nw >= 250000 ? 0.55
  : nw >= 50000 ? 0.7
  : nw >= 10000 ? 0.85
  : 1;

// ===== Patrimoine par FAMILLES. Un nouveau palier REMPLACE l'ancien (reprise de l'ancien). =====
// Toutes les familles déterminent la CLASSE SOCIALE = le niveau (statut). "business" donne en plus du revenu.
const FAM = [
  { id: "vetements", name: "Vêtements", name_en: "Clothing", life: true, start: "T-shirt troué", start_en: "Torn t-shirt", tiers: [
    { n: "Fringues correctes",              n_en: "Decent clothes",            price: 60,       resale: 15,      line: "Tu ne sens plus tout à fait la défaite.", line_en: "You don't quite smell of defeat anymore." },
    { n: "Costume bas de gamme",            n_en: "Cheap suit",                price: 18000,    resale: 3000 },
    { n: "Montre correcte",                 n_en: "Decent watch",              price: 350000,   resale: 90000 },
    { n: "Lunettes & chaussures de marque", n_en: "Designer glasses & shoes",  price: 1500000,  resale: 400000 },
    { n: "Tenue sur-mesure",                n_en: "Tailored outfit",           price: 12000000, resale: 3000000 },
  ] },
  { id: "logement", name: "Logement", name_en: "Housing", life: true, start: "Garage", start_en: "Garage", tiers: [
    { n: "Matelas & frigo",     n_en: "Mattress & fridge",       price: 300,      resale: 80,      line: "Ce soir, le sol a perdu.",                                line_en: "Tonight, the floor lost." },
    { n: "Studio humide",       n_en: "Damp studio",             price: 7500,     resale: 4500,    line: "Tu quittes le garage. Il ne te regrettera pas.",          line_en: "You leave the garage. It won't miss you." },
    { n: "Appartement correct", n_en: "Decent flat",             price: 35000,    resale: 24000 },
    { n: "Maison de banlieue",  n_en: "Suburban house",          price: 250000,   resale: 180000 },
    { n: "Loft industriel",     n_en: "Industrial loft",         price: 2000000,  resale: 1350000 },
    { n: "Villa moderne",       n_en: "Modern villa",            price: 8000000,  resale: 5600000, line: "Une villa. Le garage n'est plus qu'un mauvais rêve.",     line_en: "A villa. The garage is just a bad dream now." },
  ] },
  { id: "vehicule", name: "Véhicule", name_en: "Vehicle", life: true, start: "À pied", start_en: "On foot", tiers: [
    { n: "Scooter fatigué",    n_en: "Tired scooter",      price: 2500,     resale: 900,     line: "Deux roues. L'une d'elles croit en toi.",                line_en: "Two wheels. One of them believes in you." },
    { n: "Voiture cabossée",   n_en: "Dented car",         price: 12000,    resale: 5500 },
    { n: "Voiture compacte",   n_en: "Compact car",        price: 55000,    resale: 32000 },
    { n: "Berline d'occasion", n_en: "Used sedan",         price: 120000,   resale: 70000 },
    { n: "SUV luxueux",        n_en: "Luxury SUV",         price: 1200000,  resale: 650000 },
    { n: "Supercar",           n_en: "Supercar",           price: 12000000, resale: 5500000, line: "Quatre roues. Deux d'entre elles croient en toi.",      line_en: "Four wheels. Two of them believe in you." },
  ] },
  { id: "business", name: "Business", name_en: "Business", life: false, start: "Sans revenu", start_en: "No income", tiers: [
    { n: "Café minable",        n_en: "Sketchy café",        price: 500000,   resale: 260000,  inc: 200,    line: "De l'argent qui dort à ta place.", line_en: "Money sleeping in your place." },
    { n: "Laverie automatique", n_en: "Laundromat",          price: 850000,   resale: 520000,  inc: 600 },
    { n: "Bar de quartier",     n_en: "Neighborhood bar",    price: 3200000,  resale: 1700000, inc: 2500 },
    { n: "Salle d'arcade",      n_en: "Arcade",              price: 5000000,  resale: 2400000, inc: 5000 },
    { n: "Petit hôtel",         n_en: "Small hotel",         price: 18000000, resale: 10000000, inc: 18000 },
    { n: "Casino clandestin",   n_en: "Underground casino",  price: 85000000, resale: 55000000, inc: 80000, line: "Tu possèdes la maison. La maison gagne toujours.", line_en: "You own the house. The house always wins." },
  ] },
];
const FAM0 = { vetements: 0, logement: 0, vehicule: 0, business: 0 };
// ===== Porte-bonheur : ameliorations a poser sur la machine, achetables 1x, augmentent legerement la RTP =====
// Ordre cout/bonus croissant : trefle (legere), fer (mid), patte (forte).
const CHARMS = {
  clover:    { fr: "Sticker trèfle", en: "Clover sticker",     price: 1500,    bonus: 1.04 },
  horseshoe: { fr: "Fer à cheval", en: "Horseshoe",        price: 35000,   bonus: 1.08 },
  rabbit:    { fr: "Patte de lapin", en: "Rabbit's foot",  price: 500000,  bonus: 1.13 },
};
const CHARM_KEYS = ["clover", "horseshoe", "rabbit"];
const CHARMS_0 = { clover: false, horseshoe: false, rabbit: false };
const ownedTier = (f, lvl) => (lvl[f.id] > 0 ? f.tiers[lvl[f.id] - 1] : null);
// classe sociale issue des familles "de vie" (somme des paliers)
const CLASSES = {
  fr: ["à la rue", "survie", "précaire", "classe moyenne", "aisé", "riche", "grande fortune", "empire"],
  en: ["on the street", "survival", "precarious", "middle class", "well-off", "rich", "great fortune", "empire"],
};
// chaque classe sociale débloque un LIEU de jeu de plus en plus prestigieux
const VENUES = {
  fr: ["garage", "bar du coin", "tripot de quartier", "salle de jeux", "casino municipal", "casino privé", "cercle de jeu", "palais du hasard"],
  en: ["garage", "corner bar", "neighborhood joint", "arcade", "town casino", "private casino", "gaming club", "palace of chance"],
};
const classOf = (lvl) => {
  const s = lvl.vetements + lvl.logement + lvl.vehicule + lvl.business;   // 0..23 : tout le patrimoine compte
  return s >= 22 ? 7 : s >= 18 ? 6 : s >= 14 ? 5 : s >= 10 ? 4 : s >= 6 ? 3 : s >= 3 ? 2 : s >= 1 ? 1 : 0;
};

// ===== Bandes fixes des rouleaux =====
// Densite ajustee pour V9 : plus de coin/star/house/eye (paliers small + remboursements
// frequents), garde les rares (crown, joker) -> distribution alignee sur les cibles
// realistes (cf. /tmp/sim_omp3.py)
const BAND_W = { coin: 7, star: 6, house: 5, diamond: 4, bolt: 3, eye: 3, joker: 2, skull: 2, crack: 2, crown: 1 };
const BAND_ALL = Object.keys(BAND_W);
const POOL = (() => { const p = []; BAND_ALL.forEach((k) => { for (let i = 0; i < BAND_W[k]; i++) p.push(k); }); return p; })();
const pick = (p) => p[(Math.random() * p.length) | 0];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function buildBand(seed){
  const arr = [];
  BAND_ALL.forEach((k) => { for (let i = 0; i < BAND_W[k]; i++) arr.push(k); });
  const rnd = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; }
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === arr[i - 1]) { for (let j = i + 1; j < arr.length; j++) { if (arr[j] !== arr[i - 1]) { [arr[i], arr[j]] = [arr[j], arr[i]]; break; } } }
  }
  return arr;
}
const BANDS = [buildBand(1337), buildBand(7331), buildBand(4242)];
const bandAt = (band, idx) => band[((idx % band.length) + band.length) % band.length];

// ===== Sauvegarde =====
function loadSave() { try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }

// ===== Sons (Web Audio, synthese pure, aucun asset externe) =====
let _audioCtx = null;
function getAudioCtx() {
  if (_audioCtx) {
    if (_audioCtx.state === "suspended") _audioCtx.resume();
    return _audioCtx;
  }
  try {
    const AC = (typeof window !== "undefined") && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    _audioCtx = new AC();
  } catch { return null; }
  return _audioCtx;
}
// tone(freq, dur, type, gain, delay) : oscillateur + enveloppe lineaire/expo
function tone(freq, dur, type, gain, delay) {
  type = type || "sine"; gain = gain == null ? 0.12 : gain; delay = delay || 0;
  const ctx = getAudioCtx(); if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(gain, t0 + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env); env.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.01);
}
// Echantillons audio (WAV) : decodes une fois et caches en AudioBuffer pour rejouer sans latence.
const _bufCache = {};
function playSample(url, gain) {
  gain = gain == null ? 1 : gain;
  const ctx = getAudioCtx(); if (!ctx) return;
  const buf = _bufCache[url];
  if (!buf) {
    fetch(url).then((r) => r.arrayBuffer()).then((ab) => ctx.decodeAudioData(ab)).then((b) => { _bufCache[url] = b; }).catch(() => {});
    return;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g); g.connect(ctx.destination);
  try { src.start(); } catch {}
}
const SFX = {
  click:      () => playSample(clickUrl, 0.8),
  reelStop:   () => playSample(reelStopUrl, 0.7),
  winSmall:   () => { tone(523, 0.10); tone(659, 0.14, "sine", 0.12, 0.06); },
  winBig:     () => { tone(523, 0.09); tone(659, 0.09, "sine", 0.12, 0.07); tone(784, 0.17, "sine", 0.14, 0.14); },
  winJackpot: () => { tone(523, 0.09); tone(659, 0.09, "sine", 0.12, 0.07); tone(784, 0.09, "sine", 0.13, 0.14); tone(1047, 0.22, "sine", 0.16, 0.21); },
  skull:      () => { tone(130, 0.18, "sine", 0.16); tone(110, 0.28, "sine", 0.16, 0.12); },
  crack:      () => tone(80, 0.22, "sawtooth", 0.13),
  card:       () => tone(988, 0.08, "sine", 0.14),
  crisis:     () => { tone(680, 0.10, "square", 0.13); tone(680, 0.10, "square", 0.13, 0.18); },
  coin:       () => { tone(880, 0.05, "triangle", 0.10); tone(1175, 0.06, "triangle", 0.10, 0.04); },
};

// ===== Narratif : punchlines noir/blanc, ironiques, affichees de temps en temps =====
const QUIPS_FR = {
  perte: [
    "Bien joué, tu viens de financer la machine.",
    "La mise disparaît. Étonnant.",
    "Rien. Même pas un petit effort.",
    "La machine garde tout, comme prévu.",
    "Tu paies pour regarder des rouleaux tourner.",
    "Zéro gain. Belle optimisation.",
    "La mise est partie vivre ailleurs.",
    "Rien ne tombe, sauf ton solde.",
    "Encore une décision brillante.",
    "La machine te remercie pour le don.",
  ],
  petit: [
    "Tu gagnes presque quelque chose.",
    "Incroyable, quelques pièces.",
    "Ça rembourse à peine l'erreur.",
    "Petit gain, grande illusion.",
    "Tu peux rejouer et reperdre.",
    "La machine a eu pitié. Un peu.",
    "Pas riche, juste moins ridicule.",
    "Le minimum syndical.",
    "Ça paie le bruit du levier.",
    "Tu avances d'un demi millimètre.",
  ],
  moyen: [
    "Ah, enfin un truc qui paie.",
    "Pas mal. La machine s'est trompée.",
    "Tu récupères un peu de dignité.",
    "Voilà, ça ressemble à un gain.",
    "La mise revient avec des copains.",
    "Correct. Ne prends pas confiance.",
    "Tu viens de gagner le droit de tenter pire.",
    "Solde en hausse, ego aussi. Mauvaise idée.",
    "Ça paie. Pour une fois.",
    "La machine lâche du cash sous contrainte.",
  ],
  gros: [
    "Là, ça devient moins honteux.",
    "Beau coup. Essaie de ne pas tout rendre.",
    "La machine vient de rater son coup.",
    "Ton solde respire. Temporairement.",
    "Gros gain. Mauvaise nouvelle pour ta prudence.",
    "Tu viens de gagner assez pour devenir dangereux.",
    "Le tiroir crache enfin quelque chose d'utile.",
    "Bien. Maintenant tu vas croire que tu maîtrises.",
    "Ça monte. Reste calme, donc impossible.",
    "Le cash revient, la sagesse non.",
  ],
  tres_gros: [
    "Gros coup. La machine doit être malade.",
    "Là, même ton banquier cligne des yeux.",
    "Tu viens de transformer une mauvaise idée en argent.",
    "Beau miracle statistique.",
    "Tu viens de gagner beaucoup trop pour rester prudent.",
    "Le jeu vient de t'encourager à faire n'importe quoi.",
    "Tu montes vite. La chute aura du style.",
    "La machine paie. Profite, elle va s'en souvenir.",
    "Ça sent la confiance excessive.",
    "Très gros gain. Très mauvaise influence.",
  ],
  jackpot: [
    "Jackpot. Tu vas devenir insupportable.",
    "Voilà. Maintenant tu penses être un génie.",
    "La machine vient de perdre patience.",
    "Gros jackpot. Mauvaise leçon apprise.",
    "Tu viens de battre les probabilités et le bon sens.",
    "Le tiroir déborde, ton calme aussi.",
    "Jackpot. Évite de faire semblant que c'était prévu.",
    "Tu gagnes très gros. La prudence quitte la pièce.",
    "Félicitations, tu es officiellement dangereux.",
    "La machine lâche tout. Accident industriel.",
  ],
  skull1: [
    "Mauvais signe. Continue, évidemment.",
    "Un crâne. Ambiance saine.",
    "Petit rappel que tout peut mal finir.",
    "Rien ne saute. Pas encore.",
  ],
  skull2: [
    "La moitié du cash disparaît. Propre.",
    "50 % du cash perdu. Gestion exemplaire.",
    "Ton solde vient de se faire couper en deux.",
    "Demi ruine. On progresse.",
  ],
  skull3: [
    "Tout ton cash et ton patrimoine sautent.",
    "Ruine totale. Très belle performance.",
    "Plus rien. Même la machine trouve ça violent.",
    "Cash perdu, patrimoine perdu, ego touché.",
  ],
  crack1: [
    "Une fissure. La machine juge ton choix.",
    "Ça craque. Comme ta stratégie.",
    "Premier avertissement gratuit. Rare.",
    "La machine encaisse. Pour l'instant.",
  ],
  crack2: [
    "25 % du cash perdu. Ça pique.",
    "Un quart du cash disparaît. Décision rentable.",
    "25 % de cash en moins. Merci la fissure.",
    "La machine craque, ton solde aussi.",
    "Quart de cash perdu. Simple, net, humiliant.",
  ],
  crack3: [
    "Machine cassée. Fin de partie.",
    "Trois fissures. Rideau.",
    "La machine lâche. Score sauvegardé.",
    "Fin de run. Elle aura tenu plus longtemps que toi.",
  ],
};
const QUIPS_EN = {
  perte: [
    "Nice. You just funded the machine.",
    "Bet vanishes. Surprising.",
    "Nothing. Not even a tiny effort.",
    "The machine keeps it all, as planned.",
    "You pay to watch reels spin.",
    "Zero gain. Beautiful optimization.",
    "Your bet moved out.",
    "Nothing drops. Except your balance.",
    "Another brilliant decision.",
    "The machine thanks you for the donation.",
  ],
  petit: [
    "You almost won something.",
    "Incredible. A few coins.",
    "Barely covers the mistake.",
    "Small win, big illusion.",
    "You can replay and lose again.",
    "The machine took pity. A little.",
    "Not rich, just less ridiculous.",
    "The bare minimum.",
    "It pays for the lever's noise.",
    "You move forward half a millimeter.",
  ],
  moyen: [
    "Ah, finally something that pays.",
    "Not bad. The machine made a mistake.",
    "You recover a little dignity.",
    "There. That looks like a win.",
    "Your bet comes back with friends.",
    "Decent. Don't get cocky.",
    "You just earned the right to try worse.",
    "Balance up, ego too. Bad idea.",
    "It pays. For once.",
    "The machine drops cash under duress.",
  ],
  gros: [
    "Now it's less embarrassing.",
    "Nice shot. Try not to give it all back.",
    "The machine just missed.",
    "Your balance breathes. Briefly.",
    "Big win. Bad news for your caution.",
    "You just won enough to get dangerous.",
    "The drawer finally spits something useful.",
    "Good. Now you'll think you've got it.",
    "Going up. Stay calm — impossible, then.",
    "Cash comes back, wisdom doesn't.",
  ],
  tres_gros: [
    "Big hit. The machine must be sick.",
    "Even your banker blinks now.",
    "You turned a bad idea into money.",
    "Lovely statistical miracle.",
    "You won way too much to stay careful.",
    "The game just told you to do anything.",
    "Climbing fast. The fall will have style.",
    "The machine pays. Enjoy — it'll remember.",
    "Smells like overconfidence.",
    "Very big win. Very bad influence.",
  ],
  jackpot: [
    "Jackpot. You'll become unbearable.",
    "There. Now you think you're a genius.",
    "The machine just lost patience.",
    "Big jackpot. Bad lesson learned.",
    "You beat the odds and common sense.",
    "Drawer overflows, so does your calm.",
    "Jackpot. Don't pretend you planned it.",
    "Huge win. Caution leaves the room.",
    "Congrats. You're officially dangerous.",
    "Machine releases everything. Industrial accident.",
  ],
  skull1: [
    "Bad sign. Keep going, obviously.",
    "A skull. Wholesome vibe.",
    "Small reminder that all can end badly.",
    "Nothing blows up. Not yet.",
  ],
  skull2: [
    "Half your cash vanishes. Clean.",
    "50% cash lost. Exemplary management.",
    "Your balance just got cut in half.",
    "Half ruin. Progress.",
  ],
  skull3: [
    "All your cash and wealth blown.",
    "Total ruin. Beautiful performance.",
    "Nothing left. Even the machine finds it harsh.",
    "Cash gone, wealth gone, ego bruised.",
  ],
  crack1: [
    "A crack. The machine judges your choice.",
    "It cracks. Like your strategy.",
    "First warning, free. Rare.",
    "The machine takes it. For now.",
  ],
  crack2: [
    "25% cash lost. Stings.",
    "A quarter vanishes. Profitable choice.",
    "25% less cash. Thanks, fissure.",
    "Machine cracks, so does your balance.",
    "Quarter cash lost. Simple, clean, humiliating.",
  ],
  crack3: [
    "Machine broken. Game over.",
    "Three cracks. Curtain.",
    "The machine gives up. Score saved.",
    "End of run. It lasted longer than you.",
  ],
};
const N = {
  fr: {
    ...QUIPS_FR,
    buy:     ["Tu achètes un bout de vie.", "Ça change rien. Ça change tout.", "Un objet de plus pour te sentir vivant."],
    sell:    ["Tu vends ce que tu avais acheté pour te sentir vivant.", "Retour en arrière. Ça fait mal où il faut."],
    classUp: {
      1: "Tu n'es plus tout à fait à terre.",
      2: "Un semblant de toit. Ça compte.",
      3: "Tu ressembles à quelqu'un de normal. Troublant.",
      4: "On te tient la porte, maintenant.",
      5: "Ton ancien patron se souvient soudain de ton nom.",
      6: "Les gens rient à tes blagues avant la chute.",
      7: "La ville murmure ton nom. La machine veut encore une pièce.",
    },
  },
  en: {
    ...QUIPS_EN,
    buy:     ["You buy a piece of a life.", "It changes nothing. It changes everything.", "One more object to feel alive."],
    sell:    ["You sell what you bought to feel alive.", "Walking it back. It hurts where it should."],
    classUp: {
      1: "You're not quite on the ground anymore.",
      2: "A semblance of a roof. It counts.",
      3: "You look like a normal person. Unsettling.",
      4: "People hold the door for you now.",
      5: "Your old boss suddenly remembers your name.",
      6: "People laugh at your jokes before the punchline.",
      7: "The city whispers your name. The machine wants another coin.",
    },
  },
};

// ===== Classement du tirage pour piocher la bonne categorie de punchline =====
// Renvoie une cle dans QUIPS_FR ou null si on ne dit rien
function classifyForQuip(res, targets) {
  // 2 ou 3 skull/crack : evenement punitif, prioritaire
  if (res.kind === -1) {
    const lvl = res.count >= 3 ? 3 : 2;
    return res.sym === "skull" ? "skull" + lvl : "crack" + lvl;
  }
  // gains
  if (res.kind === 3 && res.sym === "joker") return "jackpot";
  if (res.kind > 0) {
    const m = res.mult || 0;
    if (m >= 100) return "jackpot";
    if (m >= 40)  return "tres_gros";
    if (m >= 18)  return "gros";
    if (m >= 8)   return "moyen";
    return "petit";
  }
  // ni gain ni penalite : si 1 skull / 1 crack on peut piquer un warning, sinon perte simple
  const skulls = targets.filter((t) => t === "skull").length;
  const cracks = targets.filter((t) => t === "crack").length;
  if (skulls >= 1) return "skull1";
  if (cracks >= 1) return "crack1";
  return "perte";
}

// Chance d'afficher la punchline selon la categorie : evenements rares = plus souvent
const QUIP_P = {
  jackpot: 0.95, tres_gros: 0.85, gros: 0.55, moyen: 0.35, petit: 0.30, perte: 0.30,
  skull1: 0.25, skull2: 0.90, skull3: 1.00,
  crack1: 0.25, crack2: 0.90, crack3: 1.00,
};


// ===== I18N : table de traduction FR / EN, lookup via t(key) en runtime =====
const T = {
  // header
  argent:        { fr: "argent",         en: "money" },
  pull_lever:    { fr: "tire le levier",  en: "pull the lever" },
  nudge_up:      { fr: "nudge haut",      en: "nudge up" },
  nudge_down:    { fr: "nudge bas",       en: "nudge down" },
  repull_aria:   { fr: "rejouer ce rouleau", en: "re-spin this reel" },
  niveau:        { fr: "niveau",         en: "level" },
  par_tour:      { fr: "/tour",          en: "/spin" },
  // status readouts
  broken_msg:    { fr: "machine cassée · fin de partie",   en: "machine broken · game over" },
  broke_msg:     { fr: "à sec · vends un bien",            en: "broke · sell something" },
  skull_2_msg:   { fr: "ruine partielle · -50% cash",      en: "partial ruin · -50% cash" },
  skull_3_msg:   { fr: "ruine totale",                     en: "total ruin" },
  crack_2_msg:   { fr: "machine fissurée · -25% cash",     en: "machine cracked · -25% cash" },
  crack_3_msg:   { fr: "machine cassée",                   en: "machine broken" },
  idle_msg:      { fr: "une pièce a tout commencé · un tour peut tout finir",
                   en: "one coin started it · one pull can end it" },
  // bet area
  mise:          { fr: "mise",           en: "bet" },
  mise_max:      { fr: "mise max",       en: "max bet" },
  // shop buttons
  acheter:       { fr: "Acheter",        en: "Buy" },
  ma_vie:        { fr: "Ma vie",         en: "My life" },
  wild:          { fr: "wild",           en: "wild" },
  danger:        { fr: "danger",         en: "danger" },
  // pause menu
  pause:         { fr: "pause",          en: "pause" },
  reprendre:     { fr: "reprendre",      en: "resume" },
  regles:        { fr: "règles",         en: "rules" },
  son:           { fr: "son",            en: "sound" },
  mode_sombre:   { fr: "mode sombre",    en: "dark mode" },
  langue:        { fr: "langue",         en: "language" },
  recommencer:   { fr: "recommencer",    en: "restart" },
  on:            { fr: "on",             en: "on" },
  off:           { fr: "off",            en: "off" },
  oui:           { fr: "oui",            en: "yes" },
  non:           { fr: "non",            en: "no" },
  confirm_reset: { fr: "Tu effaces tout.|Une pièce.|Sûr ?",
                   en: "You wipe it all.|One coin.|Sure?" },
  // stats labels
  tours_joues:   { fr: "tours joués",         en: "spins played" },
  plus_gros_gain:{ fr: "plus gros gain",      en: "biggest win" },
  peak_patrim:   { fr: "record de patrimoine",     en: "wealth record" },
  record:        { fr: "record (toutes parties)", en: "record (all runs)" },
  record_patrim: { fr: "record de patrimoine",     en: "wealth record" },
  record_gain:   { fr: "plus gros gain",      en: "biggest win" },
  cartes_obt:    { fr: "cartes obtenues",     en: "cards earned" },
  statut_social: { fr: "statut social",       en: "social status" },
  tut_buy:       { fr: "Le but du jeu : récupérer ce que tu as perdu et monter de classe sociale en achetant des biens (vêtements, logement, véhicule, business).",
                   en: "The goal: recover what you lost and climb the social ladder by buying assets (clothes, housing, vehicle, business)." },
  tut_life:      { fr: "Ouvre cette fenêtre pour suivre ton patrimoine en détail et revendre tes biens si tu es en difficulté. La revente est moins chère que l'achat, réfléchis bien avant de céder.",
                   en: "Open this to track your assets in detail and sell them back if you're struggling. Resale is cheaper than the buy price — think before letting go." },
  tut_pause:     { fr: "Dans le menu pause tu retrouves les règles complètes, tes records de patrimoine et de classe sociale, ainsi que les réglages son et langue.",
                   en: "The pause menu holds the full rules, your wealth and social-class records, plus sound and language settings." },
  net:           { fr: "net",                 en: "net" },
  // intro
  last_coin:     { fr: "ONE MORE PULL", en: "ONE MORE PULL" },
  derniere_piece:{ fr: "la dernière chance", en: "the last chance" },
  intro_p1:      { fr: "Tu vis dans un garage.",
                   en: "You live in a garage." },
  intro_p2:      { fr: "Plus de boulot, plus de femme, plus d'argent. Mais une énorme envie de revanche.",
                   en: "No job, no woman, no money. But a huge thirst for revenge." },
  intro_p3:      { fr: "Un soir, sur le trottoir, tu tombes sur une vieille machine à sous. Elle est sale, cabossée, presque morte.",
                   en: "One night, on the sidewalk, you stumble on an old slot machine. Filthy, dented, almost dead." },
  intro_p4:      { fr: "Le levier bouge encore.",
                   en: "The lever still moves." },
  il_te_reste:   { fr: "il te reste",    en: "you have left" },
  une_piece:     { fr: "1 pièce",        en: "1 coin" },
  intro_tag:     { fr: "une pièce a tout commencé · un tour peut tout finir",
                   en: "one coin started it · one pull can end it" },
  inserer_piece: { fr: "insérer la pièce", en: "insert the coin" },
  disclaimer:    { fr: "argent fictif · aucun paiement réel",
                   en: "fake money · no real wagering" },
  // buy modal
  ma_vie_improve:{ fr: "ma vie · améliorer",       en: "my life · upgrade" },
  monte_classe:  { fr: "monte de classe sociale",  en: "climb a social class" },
  cash:          { fr: "Cash",                     en: "Cash" },
  buy_explain:   { fr: "un nouveau palier remplace l'ancien",
                   en: "a new tier replaces the old one" },
  remplace:      { fr: "remplace",                 en: "replaces" },
  max_atteint:   { fr: "max atteint",              en: "max reached" },
  retour:        { fr: "retour",                   en: "back" },
  charms_title:  { fr: "Porte-bonheur",            en: "Lucky charms" },
  charms_sub:    { fr: "bonus de chance permanent", en: "permanent luck bonus" },
  chance:        { fr: "de chance",                en: "luck" },
  possede:       { fr: "possédé",                  en: "owned" },
  revenu:        { fr: "revenu",                   en: "income" },
  // assets modal
  patrimoine:    { fr: "patrimoine",      en: "wealth" },
  vendre:        { fr: "vendre",          en: "sell" },
  sell_warn:     { fr: "la revente fait mal, tu repars de zéro chez les parents",
                   en: "selling hurts, you go back to square one at your parents'" },
  // rules
  comment:       { fr: "comment ça marche", en: "how it works" },
  rules_short:   { fr: "mise · tire le levier · encaisse ou recommence",
                   en: "bet · pull the lever · cash in or restart" },
  symboles:      { fr: "symboles",          en: "symbols" },
  combinaisons:  { fr: "combinaisons",      en: "combinations" },
  c_3:           { fr: "3 identiques",      en: "3 of a kind" },
  c_3_d:         { fr: "gain selon le symbole (×12 à ×127)",
                   en: "payout depends on symbol (×12 to ×127)" },
  c_2:           { fr: "2 identiques",      en: "2 of a kind" },
  c_2_d:         { fr: "gain selon le symbole (×2 à ×14) — paire",
                   en: "payout by symbol (×2 to ×14) — pair" },
  c_2j:          { fr: "2 + Joker",         en: "2 + Joker" },
  c_2j_d:        { fr: "compté comme 3 identiques", en: "counted as 3 of a kind" },
  c_3j:          { fr: "3 Jokers",          en: "3 Jokers" },
  c_3j_d:        { fr: "jackpot",           en: "jackpot" },
  c_skull_2:     { fr: "2 Crâne",           en: "2 Skulls" },
  c_skull_2_d:   { fr: "ruine partielle — tu perds 50% de ton cash",
                   en: "partial ruin — lose 50% of your cash" },
  c_skull_3:     { fr: "3 Crâne",           en: "3 Skulls" },
  c_skull_3_d:   { fr: "ruine totale — cash et patrimoine effaces",
                   en: "total ruin — cash and assets wiped" },
  c_crack_2:     { fr: "2 Fissure",         en: "2 Cracks" },
  c_crack_2_d:   { fr: "machine fissuree — reparation forcee, -25% du cash",
                   en: "machine cracked — forced repair, -25% of cash" },
  c_crack_3:     { fr: "3 Fissure",         en: "3 Cracks" },
  c_crack_3_d:   { fr: "machine cassee — fin de partie, score sauvegarde",
                   en: "machine broken — game over, score saved" },
  hold_t:        { fr: "HOLD · bloquer un rouleau", en: "HOLD · lock a reel" },
  hold_cards:    { fr: "Cartes HOLD",       en: "HOLD cards" },
  hold_d:        { fr: "une paire de Bolt fait tomber 1 carte, un triple en fait tomber 2 (plafond 9). Avant de tirer, tape un rouleau pour le bloquer : il garde son symbole au tour suivant. Coût : 1 carte par rouleau bloqué.",
                   en: "a Bolt pair drops 1 card, a triple drops 2 (cap 9). Before pulling, tap a reel to lock it: it keeps its symbol on the next spin. Cost: 1 card per locked reel." },
  nudge_t:       { fr: "NUDGE · décaler après le spin", en: "NUDGE · shift after the spin" },
  nudge_cards:   { fr: "Cartes NUDGE",      en: "NUDGE cards" },
  nudge_d:       { fr: "une paire d'Eye fait tomber 1 carte, un triple en fait tomber 2 (plafond 9). Après un tour, des flèches ▲ ▼ apparaissent sur les rouleaux : un clic décale le rouleau d'un cran et te paie le bonus si le nouveau combo est meilleur. Une seule manipulation par tour.",
                   en: "an Eye pair drops 1 card, a triple drops 2 (cap 9). After a spin, ▲ ▼ arrows appear on the reels: one click nudges the reel by one cell and pays the bonus if the new combo is better. One action per spin." },
  repull_t:      { fr: "REPULL · rejouer un rouleau",  en: "REPULL · re-spin a reel" },
  repull_cards:  { fr: "Cartes REPULL",                en: "REPULL cards" },
  repull_d:      { fr: "capacité la plus puissante donc la plus rare (plafond 3). Une paire de Crown fait tomber 1 carte, un triple en fait tomber 2. Après un tour, un bouton ↻ apparaît sur chaque rouleau : clic = ce rouleau seul rejoue au hasard. Les deux autres restent bloqués. Bonus payé si le nouveau combo est meilleur. Une capacité par tour, toutes confondues.",
                   en: "the most powerful ability so the rarest (cap 3). A Crown pair drops 1 card, a triple drops 2. After a spin, a ↻ button appears on each reel: click = that reel alone re-spins randomly. The other two stay locked. Bonus paid if the new combo is better. One ability per spin, all combined." },
  rules_foot:    { fr: "petite mise = sûr mais lent · grosse mise = gros gains ou ruine",
                   en: "small bet = safe but slow · big bet = big wins or ruin" },
  // holdbar hints
  hint_repull:   { fr: "↻ rejoue un rouleau",                   en: "↻ re-spin a reel" },
  hint_nudge:    { fr: "ajuste un rouleau · ▲ ou ▼",            en: "nudge a reel · ▲ or ▼" },
  hint_held:     { fr: "rouleau bloqué · tire le levier",       en: "reel locked · pull the lever" },
  hint_hold:     { fr: "tape un rouleau pour le bloquer",        en: "tap a reel to lock it" },
  // explications detaillees affichees au-dessus de la machine quand une capacite est armee
  expl_hold:     { fr: "HOLD · Tape un rouleau pour le bloquer, puis tire le levier. Le symbole bloqué reste au tour suivant.",
                   en: "HOLD · Tap a reel to lock it, then pull the lever. The locked symbol stays for the next spin." },
  expl_nudge:    { fr: "NUDGE · Apres un tour, clique ▲ ou ▼ sur un rouleau pour le decaler d'un cran et eventuellement decrocher un meilleur combo.",
                   en: "NUDGE · After a spin, click ▲ or ▼ on a reel to shift it by one cell and possibly land a better combo." },
  expl_repull:   { fr: "REPULL · Apres un tour, clique ↻ sur un rouleau pour le rejouer seul. Les deux autres restent bloqués.",
                   en: "REPULL · After a spin, click ↻ on a reel to re-spin it alone. The two others stay locked." },
  over_reason_crack: { fr: "3 fissures alignées · la machine s'est cassée",
                       en: "3 cracks in a row · the machine broke" },
  expl_broke:    { fr: "Plus une pièce. Si tu veux continuer, va dans MA VIE et vends un de tes biens.",
                   en: "Out of coins. If you want to keep going, open MA VIE and sell one of your assets." },
  // empire / game over
  empire:        { fr: "EMPIRE",                                  en: "EMPIRE" },
  empire_sub:    { fr: "la ville a ton nom",                      en: "the city bears your name" },
  empire_lead:   { fr: "Parti d'une pièce. Regarde-toi.",         en: "Started with one coin. Look at you now." },
  empire_tag:    { fr: "Ton nom est sur les murs.|La machine, elle, ne lit pas.",
                   en: "Your name is on the walls.|The machine, it doesn't read." },
  encore_tour:   { fr: "encore un tour",                          en: "one more pull" },
  over:          { fr: "À SEC",                                   en: "BROKE" },
  over_sub:      { fr: "tout est parti",                          en: "all gone" },
  over_tag:      { fr: "Le bac est silencieux.|La machine, elle, est patiente.",
                   en: "The tray is silent.|The machine, it's patient." },
  // levelup
  nouveau_statut:{ fr: "nouveau statut",  en: "new status" },
  // cards notif
  carte:         { fr: "carte",            en: "card" },
  // dev menu
  dev:           { fr: "menu développeur", en: "developer menu" },
  dev_lead:      { fr: "raccourcis de test", en: "test shortcuts" },
  dev_money:     { fr: "argent",           en: "money" },
  dev_cards:     { fr: "cartes de capacité", en: "ability cards" },
  dev_screens:   { fr: "écrans",           en: "screens" },
  dev_reset_cash:{ fr: "reset 1$",         en: "reset $1" },
  dev_max_all:   { fr: "max all",          en: "max all" },
  dev_clear:     { fr: "vider",            en: "clear" },
  dev_intro:     { fr: "intro",            en: "intro" },
  dev_empire:    { fr: "empire",           en: "empire" },
  dev_over:      { fr: "game over",        en: "game over" },
};

// stats agregees sur la partie : alimentees par les hooks de gameplay, persistees, affichees pause/over/empire
const STATS0 = { biggestWin: 0, peakWorth: 0, cardsEarned: 0, totalBet: 0, totalWon: 0, peakClass: 0 };

export default function LastCoin() {
  const initRef = useRef(null);
  if (!initRef.current) initRef.current = loadSave() || {};
  const init = initRef.current;

  // started = a clique sur 'inserer la piece' au moins une fois. Tant que false,
  // l'intro s'affiche meme si l'auto-save a deja persiste l'etat initial.
  const [started, setStarted] = useState(() => !!init.started);
  const [screen, setScreen] = useState(() => (init.started ? "play" : "intro"));
  const [cash, setCash] = useState(() => (init.cash != null ? init.cash : 1));
  const [lvl, setLvl] = useState(() => ({ ...FAM0, ...(init.lvl || {}) }));
  const [charms, setCharms] = useState(() => ({ ...CHARMS_0, ...(init.charms || {}) }));   // porte-bonheur achetes
  const [betIdx, setBetIdx] = useState(() => init.betIdx || 0);
  const [pulls, setPulls] = useState(() => init.pulls || 0);

  const [spinning, setSpinning] = useState(false);
  const [lastWin, setLastWin] = useState(null);   // { amount, big } | { neg } | null
  const [flash, setFlash] = useState("");
  const [lampOn, setLampOn] = useState(false);
  const [winFx, setWinFx] = useState(null);        // { a, k } : montant gagné animé au bac
  const [burst, setBurst] = useState(null);        // pluie de $ sur un 3-aligné
  const [levelUp, setLevelUp] = useState(null);    // écran "NIVEAU X" à la montée de classe
  const [cardNotif, setCardNotif] = useState(null); // notification "+N HOLD" à l'obtention d'une carte
  // tutorial : 3 bulles successives (Acheter -> Ma vie -> Pause), apparait apres
  // le 1er gain d'une partie qui recommence
  const [tutorial, setTutorial] = useState(0);     // 0=none, 1=buy, 2=life, 3=pause, 99=done
  const [tutorialSeen, setTutorialSeen] = useState(() => !!init.tutorialSeen);
  const [winLine, setWinLine] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [blockedSpin, setBlockedSpin] = useState(false);   // levier tire sans piece : secousse + message "vends un bien"
  const [machineW, setMachineW] = useState(0);
  const [overlay, setOverlay] = useState(null);   // "buy" | "assets" | null
  const [gameOver, setGameOver] = useState(() => !!init.gameOver);   // 3 crack = machine cassee = fin de partie
  const [gameOverReason, setGameOverReason] = useState(() => init.gameOverReason || null);  // "crack" | null
  const [cashLoss, setCashLoss] = useState(null);                    // { amt, k } : animation "argent qui s'evapore" sur le bandeau du haut
  const [wonEmpire, setWonEmpire] = useState(() => !!init.empire);
  const [confirmReset, setConfirmReset] = useState(false);   // pause : confirmation avant de recommencer
  const [cheatSeq, setCheatSeq] = useState([]);              // cheat code pause : son, langue, son, langue, regles -> toggle bouton dev
  const [devUnlocked, setDevUnlocked] = useState(() => !!init.devUnlocked);  // bouton dev visible dans le bandeau (toggle via cheat)
  // Spin en 2 phases : cruise (vitesse constante, lineaire) puis brake (decel brutale identique pour tous).
  // Le stagger se fait UNIQUEMENT sur la duree du cruise — chaque rouleau brake de la meme facon.
  const REEL_CRUISE_SPEED = 36;                    // cells/sec, identique pour tous (tourne vite)
  const REEL_CRUISE_CELLS = [32, 58, 84];          // cruise rallonge + stagger marque
  const REEL_BRAKE_CELLS = 8;                      // brake plus court : ralentit a peine puis se bloque
  const REEL_BRAKE_DUR = 0.50;                     // brake bref et sec, avec rebond du bezier
  const REEL_RUN_TOTAL = Math.max(...REEL_CRUISE_CELLS) + REEL_BRAKE_CELLS;  // = 37 cells, taille du strip
  const reelCruiseDur = (r) => REEL_CRUISE_CELLS[r] / REEL_CRUISE_SPEED;
  const reelStartT = (r) => 2 + REEL_BRAKE_CELLS + REEL_CRUISE_CELLS[r];     // index ou cell est centree au debut (offset rest=2)
  const [reelStage, setReelStage] = useState([0, 0, 0]);   // 0=idle, 1=jump, 2=cruise, 3=brake
  const [held, setHeld] = useState([false, false, false]);                 // rouleaux marqués HOLD avant le tour
  const [holdCharges, setHoldCharges] = useState(() => init.holdCharges || 0);  // jetons HOLD dispos (gagnés via Bolt)
  const [spinHeld, setSpinHeld] = useState([false, false, false]);         // rouleaux figés pendant l'anim du tour
  const [nudgeCharges, setNudgeCharges] = useState(() => init.nudgeCharges || 0);   // cartes NUDGE (gagnées via Eye)
  const [nudgeAvail, setNudgeAvail] = useState(false);                     // fenêtre de NUDGE ouverte après le tour
  const [lastSpin, setLastSpin] = useState(null);                          // {targets, spend, lk, scale, payout} pour re-eval apres nudge/repull
  const [nudgeAnim, setNudgeAnim] = useState([false, false, false]);       // transition douce sur le rouleau qu'on decale
  const [landed, setLanded] = useState([false, false, false]);             // courte secousse "thunk" a la fin du brake
  const [repullCharges, setRepullCharges] = useState(() => init.repullCharges || 0); // cartes REPULL (gagnées via Crown)
  const [repullAvail, setRepullAvail] = useState(false);                   // fenêtre de REPULL ouverte après le tour
  const [activeAbility, setActiveAbility] = useState(null);                // "hold" | "nudge" | "repull" | null — capacite armee depuis les boutons sous la machine
  const [stats, setStats] = useState(() => ({ ...STATS0, ...(init.stats || {}) }));
  const [best, setBest] = useState(() => loadBest() || { peakWorth: 0, biggestWin: 0, peakClass: 0 });
  const [soundOn, setSoundOn] = useState(() => init.soundOn !== false);    // son ON par defaut
  const [lang, setLang] = useState(() => init.lang || "fr");                // "fr" | "en"
  const t = (k) => (T[k] && T[k][lang]) || k;                              // helper i18n
  const famName  = (f) => lang === "en" ? f.name_en  : f.name;             // i18n field accessors
  const famStart = (f) => lang === "en" ? f.start_en : f.start;
  const tierName = (x) => lang === "en" ? x.n_en     : x.n;
  const tierLine = (x) => lang === "en" ? x.line_en  : x.line;
  const soundOnRef = useRef(soundOn);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);
  // Precharge les echantillons WAV des qu'un ctx audio existe (gain 0 = preload silencieux)
  const sfx = (name) => {
    if (!soundOnRef.current) return;
    if (!_bufCache[reelStopUrl]) playSample(reelStopUrl, 0);  // amorce le decode lazy
    if (!_bufCache[clickUrl]) playSample(clickUrl, 0);
    if (SFX[name]) SFX[name]();
  };
  const machineRef = useRef(null);
  const buyBtnRef = useRef(null);
  const lifeBtnRef = useRef(null);
  const pauseBtnRef = useRef(null);
  const lampTimer = useRef(null);                    // gyro : timer de 5 s

  // strips : sens TOP-TO-BOTTOM. cells[2] = symbole au repos (bandAt(band, stop)).
  // cells[0..1] = 2 cellules au-DESSUS du repos (visibles dans la fenetre haute du rouleau au repos)
  // cells[k>=3] = bandAt(stop - (k-2)) — cellules en-dessous, parcourues pendant le spin.
  // Le buffer de 2 cellules au-dessus garantit qu'un NUDGE -1 (cell[1] centre) reste rempli en haut.
  const makeStrip = (band, stop, run) => {
    const n = run + 2;
    const cells = [bandAt(band, stop + 2), bandAt(band, stop + 1)];
    for (let k = 0; k <= n; k++) cells.push(bandAt(band, stop - k));
    return { cells, t: 2, startT: cells.length - 1 };
  };
  const restStrip = (r) => makeStrip(BANDS[r], 1, 0);
  const [strips, setStrips] = useState(() => REELS.map((_, r) => restStrip(r)));

  // dérivés
  const netWorth = cash + FAM.reduce((s, f) => { const t = ownedTier(f, lvl); return s + (t ? t.price : 0); }, 0);
  const income = FAM.reduce((s, f) => { const t = ownedTier(f, lvl); return s + ((t && t.inc) || 0); }, 0);
  const hasAssets = FAM.some((f) => lvl[f.id] > 0);
  const ownedCount = FAM.reduce((s, f) => s + (lvl[f.id] > 0 ? 1 : 0), 0);
  const classIdx = classOf(lvl);          // classe sociale = niveau (via familles de vie)
  const level = classIdx + 1;
  const socialClass = CLASSES[lang][classIdx];
  const venue = VENUES[lang][classIdx];   // lieu de jeu débloqué par la classe
  const maxBetIdx = (() => { let m = 0; for (let i = 0; i < BET_STEPS.length; i++) { if (BET_STEPS[i] <= cash) m = i; else break; } return m; })();
  const bet = cash >= 1 ? BET_STEPS[Math.min(betIdx, maxBetIdx)] : 0;

  // dimensions
  const machineH = machineW / RATIO;
  const visHpx = machineH * VIS_H / 100;
  const topExtraPx = machineH * (VIS_TOP - WIN_TOP) / 100;
  const cellH = visHpx / 1.75;
  const restY = (t) => -(t * cellH) + (visHpx - cellH) / 2 + topExtraPx;
  const symSizeFor = (r) => Math.min(cellH, machineW * REELS[r].w / 100) * 0.90;
  const reelY = (r) => {
    if (!cellH) return 0;
    if (spinHeld[r]) return restY(strips[r].t);                 // rouleau bloqué : reste sur place
    const st = reelStage[r];
    // 1 = jump : strip place tout en haut (cell de depart visible), pas de transition
    if (st === 1) return restY(reelStartT(r));
    // 2 = cruise : strip descend a vitesse constante jusqu'au seuil de freinage
    if (st === 2) return restY(2 + REEL_BRAKE_CELLS);
    // 3 = brake : strip ralentit brutalement jusqu'au repos
    if (st === 3) return restY(strips[r].t);
    return restY(strips[r].t);                                  // 0 = idle
  };

  useLayoutEffect(() => {
    const el = machineRef.current; if (!el) return;
    const u = () => setMachineW(el.clientWidth);
    u(); const ro = new ResizeObserver(u); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // sauvegarde auto
  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cash, lvl, charms, betIdx, pulls, gameOver, gameOverReason, empire: wonEmpire, holdCharges, nudgeCharges, repullCharges, stats, soundOn, lang, devUnlocked, started, tutorialSeen })); } catch {}
  }, [cash, lvl, charms, betIdx, pulls, gameOver, gameOverReason, wonEmpire, holdCharges, nudgeCharges, repullCharges, stats, soundOn, lang, devUnlocked, started, tutorialSeen]);

  // peak du patrimoine + peak de classe sociale : suivi continu
  useEffect(() => {
    setStats((s) => {
      const nextPeak = Math.max(s.peakWorth, netWorth);
      const nextClass = Math.max(s.peakClass, classIdx);
      if (nextPeak === s.peakWorth && nextClass === s.peakClass) return s;
      return { ...s, peakWorth: nextPeak, peakClass: nextClass };
    });
  }, [netWorth, classIdx]);

  // record persistant : met a jour le meilleur score si on bat le precedent
  useEffect(() => {
    setBest((b) => {
      const next = {
        peakWorth: Math.max(b.peakWorth, stats.peakWorth),
        biggestWin: Math.max(b.biggestWin, stats.biggestWin),
        peakClass: Math.max(b.peakClass || 0, stats.peakClass),
      };
      if (next.peakWorth === b.peakWorth && next.biggestWin === b.biggestWin && next.peakClass === (b.peakClass || 0)) return b;
      try { localStorage.setItem(BEST_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [stats.peakWorth, stats.biggestWin, stats.peakClass]);

  // fin de partie : à sec et plus rien à vendre
  useEffect(() => {
    if (screen === "play" && !spinning && (gameOver || (cash < 1 && !hasAssets))) setScreen("over");
  }, [cash, hasAssets, spinning, screen, gameOver]);

  const say = (txt) => { setFlash(txt); };

  // Cheat code pause menu : son, langue, son, langue, regles -> ouvre le menu dev. Sinon, action normale du bouton.
  const CHEAT = ["son", "langue", "son", "langue", "regles"];
  const pushCheat = (key) => {
    const next = [...cheatSeq, key].slice(-CHEAT.length);
    const matched = next.length === CHEAT.length && next.every((k, i) => k === CHEAT[i]);
    setCheatSeq(matched ? [] : next);
    return matched;
  };

  const newGame = () => {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    setCash(1); setLvl({ ...FAM0 }); setCharms({ ...CHARMS_0 }); setBetIdx(0); setPulls(0);
    setGameOver(false); setGameOverReason(null); setCashLoss(null); setWonEmpire(false);
    setLastWin(null); setFlash(""); setLampOn(false); setWinLine(false);
    setStrips(REELS.map((_, r) => restStrip(r))); setReelStage([0, 0, 0]); setSpinning(false);
    setHeld([false, false, false]); setHoldCharges(0); setSpinHeld([false, false, false]);
    setNudgeCharges(0); setNudgeAvail(false); setLastSpin(null); setNudgeAnim([false, false, false]);
    setRepullCharges(0); setRepullAvail(false);
    setActiveAbility(null);
    setStats({ ...STATS0 });
    setCardNotif(null); setLevelUp(null); setBurst(null); setWinFx(null);
    setOverlay(null); setConfirmReset(false); setStarted(false); setScreen("intro");   // repasse par l'intro pour rappeler le contexte
    setTutorial(0); setTutorialSeen(false);   // tutorial reapparaitra au 1er gain de la nouvelle partie
  };

  const resolveAll = useCallback((targets, spend, lk, snap) => {
    const res = evaluate(targets);
    const scale = cashScale(snap.nw);            // gains rabotes en mid/end game (palier des 10K)
    const charmBonus = CHARM_KEYS.reduce((b, k) => charms[k] ? b * CHARMS[k].bonus : b, 1);
    const payout = res.kind > 0 ? Math.round(spend * res.mult * lk * scale * charmBonus) : 0;
    setCash((c) => c + payout + income);   // c = cash déjà amputé de la mise au lancement
    setPulls((p) => p + 1);

    // Bolt = cartes HOLD : seules les paires et triples d'eclair sortent une carte (rare)
    const bolts = targets.filter((t) => t === "bolt").length;
    const holdGain = bolts >= 3 ? 2 : bolts >= 2 ? 1 : 0;
    if (holdGain > 0) setHoldCharges((c) => Math.min(9, c + holdGain));

    // Eye = cartes NUDGE : memes regles que Bolt mais sur le symbole oeil
    const eyes = targets.filter((t) => t === "eye").length;
    const nudgeGain = eyes >= 3 ? 2 : eyes >= 2 ? 1 : 0;
    if (nudgeGain > 0) setNudgeCharges((c) => Math.min(9, c + nudgeGain));

    // Crown = cartes REPULL : capacite la plus puissante donc plafond plus bas (3)
    const crowns = targets.filter((t) => t === "crown").length;
    const repullGain = crowns >= 3 ? 2 : crowns >= 2 ? 1 : 0;
    if (repullGain > 0) setRepullCharges((c) => Math.min(3, c + repullGain));

    // une seule notification a la fois : priorite REPULL > NUDGE > HOLD (du plus rare/precieux au plus commun)
    if (holdGain > 0 || nudgeGain > 0 || repullGain > 0) {
      const last = repullGain > 0 ? { n: repullGain, type: "repull" }
        : nudgeGain > 0 ? { n: nudgeGain, type: "nudge" }
        : { n: holdGain, type: "hold" };
      setCardNotif({ ...last, k: Date.now() });
      setTimeout(() => setCardNotif(null), 2400);
      sfx("card");
    }

    // memorise le tour pour pouvoir re-evaluer apres un nudge/repull ; ouvre les fenetres si on a les cartes
    setLastSpin({ targets: targets.slice(), spend, lk, scale, charmBonus, payout });
    if ((nudgeCharges + nudgeGain) > 0) setNudgeAvail(true);
    if ((repullCharges + repullGain) > 0) setRepullAvail(true);

    // stats agregees : mise totale, gains cumules, plus gros gain, cartes obtenues
    setStats((s) => ({
      ...s,
      totalBet: s.totalBet + spend,
      totalWon: s.totalWon + payout,
      biggestWin: Math.max(s.biggestWin, payout),
      cardsEarned: s.cardsEarned + holdGain + nudgeGain + repullGain,
    }));

    // --- Effets punitifs Skull / Crack ---
    // 2 Skull = ruine partielle (-50% cash), 3 Skull = ruine totale (cash et patrimoine effaces)
    // 2 Crack = machine fissuree (-25% cash, reparation forcee), 3 Crack = machine cassee (fin de partie)
    if (res.kind === -1) {
      // base apres payout+income (payout=0 sur skull/crack)
      const post = cash + income;
      let loss = 0;
      if (res.sym === "skull" && res.count === 2) { loss = post - Math.floor(post * 0.5); setCash((c) => Math.floor(c * 0.5)); }
      else if (res.sym === "skull" && res.count === 3) { loss = post; setCash(0); setLvl({ ...FAM0 }); }
      else if (res.sym === "crack" && res.count === 2) { loss = post - Math.floor(post * 0.75); setCash((c) => Math.floor(c * 0.75)); }
      else if (res.sym === "crack" && res.count === 3) { setGameOver(true); setGameOverReason("crack"); }
      if (loss > 0) {
        setCashLoss({ amt: loss, k: Date.now() });
        setTimeout(() => setCashLoss(null), 1800);
      }
    }

    const big = res.kind === 3 && res.mult >= 20;
    setLastWin(payout > 0 ? { amount: payout, big } : res.kind === -1 ? { neg: res.sym, count: res.count } : { amount: 0 });
    // Tutorial : declenche au 1er gain de la partie (apres le spin garanti)
    if (payout > 0 && !tutorialSeen && tutorial === 0) {
      setTimeout(() => setTutorial(1), 1800);
    }
    if (payout > 0) {
      setLampOn(true); setWinLine(true); setWinFx({ a: payout, k: Date.now() });
      if (lampTimer.current) clearTimeout(lampTimer.current);
      lampTimer.current = setTimeout(() => setLampOn(false), 5000);          // gyro : 5 s ou jusqu'au prochain tour
      setTimeout(() => setWinLine(false), 1400);
      setTimeout(() => setWinFx(null), 2400);          // montant blanc : animation plus longue
      // son de gain : jackpot si triple joker, big si combo >= x20, sinon small
      sfx(res.kind === 3 && res.sym === "joker" ? "winJackpot" : big ? "winBig" : "winSmall");
      if (res.kind === 3) {            // 3 alignés : pluie de $ (plus dense si gros gain)
        const count = big ? 24 : 14;
        setBurst(Array.from({ length: count }, (_, i) => ({
          dx: (Math.random() * 2 - 1) * 6.5, dy: -(2.5 + Math.random() * 7),
          rot: (Math.random() * 2 - 1) * 70, delay: Math.random() * 0.32,
          s: 0.85 + Math.random() * 0.85, k: Date.now() + i,
        })));
        setTimeout(() => setBurst(null), 1400);
      }
    } else if (res.kind === -1) {
      sfx(res.sym === "skull" ? "skull" : "crack");
    }

    // narratif : punchline aleatoire selon la categorie du tirage (de temps en temps)
    // 1er tirage de la partie : message fixe d'ouverture, peu importe le resultat
    if (pulls === 0) {
      say(lang === "fr"
        ? "On dirait que le ciel t'a pas complètement abandonné."
        : "Looks like the sky hasn't entirely abandoned you.");
    } else {
      const cat = classifyForQuip(res, targets);
      const proba = QUIP_P[cat] || 0.30;
      if (cat && Math.random() < proba) {
        const bag = N[lang][cat] || [];
        if (bag.length) say(pick(bag));
        else say("");
      } else {
        say("");
      }
    }
  }, [income, pulls]);

  const spin = () => {
    if (spinning || screen !== "play" || gameOver) return;
    if (bet < 1) {                             // à sec : machine bloquee, secousse + message pour inviter a vendre
      if (hasAssets) {
        setBlockedSpin(true);
        sfx("click");
        setTimeout(() => setBlockedSpin(false), 2200);
      }
      return;
    }
    const lk = luck();                          // multiplicateur constant : la machine ne triche plus selon le porte-monnaie
    const snap = { nw: netWorth };
    if (lampTimer.current) clearTimeout(lampTimer.current);
    setFlash(""); setLastWin(null); setLampOn(false); setWinLine(false); setWinFx(null); setBurst(null);
    setNudgeAvail(false); setRepullAvail(false); setLastSpin(null); setNudgeAnim([false, false, false]);
    setActiveAbility(null);                                          // toute capacite armee est desarmee au lancement du tour
    setPressed(true); setTimeout(() => setPressed(false), 600);
    setCash((c) => c - bet);
    setSpinning(true);
    sfx("click");

    // HOLD : on plafonne par le nombre de charges dispos. Si l'utilisateur a marqué plus que disponible (impossible via UI mais sécurité), on ignore les surplus dans l'ordre.
    const holdSnap = held.slice();
    let avail = holdCharges;
    for (let r = 0; r < 3; r++) { if (holdSnap[r] && avail > 0) avail--; else holdSnap[r] = false; }
    const consumed = holdSnap.filter(Boolean).length;
    setSpinHeld(holdSnap);
    if (consumed > 0) setHoldCharges((c) => c - consumed);
    setHeld([false, false, false]);

    const run = REEL_RUN_TOTAL;            // strip assez long pour le plus grand cruise + brake
    const first = pulls === 0;
    const targets = [];
    const newStrips = REELS.map((_, r) => {
      if (holdSnap[r]) {                              // rouleau bloqué : on garde tel quel
        targets.push(strips[r].cells[strips[r].t]);
        return strips[r];
      }
      const band = BANDS[r];
      let want = first ? "house" : pick(POOL);         // 1er tirage garanti : 3e palier (house x19), donne de quoi se refaire
      let positions = [];
      for (let i = 0; i < band.length; i++) if (band[i] === want) positions.push(i);
      if (positions.length === 0) { const idx = (Math.random() * band.length) | 0; positions = [idx]; want = band[idx]; }
      const stop = positions[(Math.random() * positions.length) | 0];
      targets.push(bandAt(band, stop));
      return makeStrip(band, stop, run);
    });

    setStrips(newStrips);
    // Phase 1 : jump aux positions de depart (par-rouleau), sans transition
    setReelStage(holdSnap.map((h) => h ? 0 : 1));
    // Phase 2 : cruise (vitesse constante identique) — passe a l'image suivante pour declencher la transition lineaire
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setReelStage((prev) => prev.map((s, i) => (holdSnap[i] ? 0 : 2)));
      // Phase 3 : pour chaque rouleau, declenche le freinage a la fin de son cruise
      REEL_CRUISE_CELLS.forEach((_, i) => {
        if (holdSnap[i]) return;
        const cruiseMs = Math.round(reelCruiseDur(i) * 1000);
        setTimeout(() => {
          setReelStage((p) => p.map((s, idx) => (idx === i ? 3 : s)));
          // Son du stop + secousse "thunk" a la fin du brake
          setTimeout(() => {
            sfx("reelStop");
            setLanded((p) => p.map((v, idx) => (idx === i ? true : v)));
            setTimeout(() => setLanded((p) => p.map((v, idx) => (idx === i ? false : v))), 320);
          }, Math.round(REEL_BRAKE_DUR * 1000 * 0.4));
        }, cruiseMs);
      });
    }));
    const longestCruise = Math.max(...REEL_CRUISE_CELLS.filter((_, i) => !holdSnap[i]).map((c) => c / REEL_CRUISE_SPEED), 0);
    const totalMs = Math.round((longestCruise + REEL_BRAKE_DUR) * 1000) + 120;
    setTimeout(() => {
      resolveAll(targets, bet, lk, snap);
      setReelStage([0, 0, 0]); setSpinning(false); setSpinHeld([false, false, false]);
    }, totalMs);
  };

  const buyNext = (f) => {                       // monte d'un palier (remplace l'ancien, reprise déduite)
    const L = lvl[f.id];
    if (L >= f.tiers.length) return;
    const tier = f.tiers[L];
    const netCost = tier.price - (L > 0 ? f.tiers[L - 1].resale : 0);
    if (cash < netCost) return;
    const newClass = classOf({ ...lvl, [f.id]: L + 1 });
    const classUp = newClass > classOf(lvl);
    setCash((c) => c - netCost); setLvl((v) => ({ ...v, [f.id]: L + 1 }));
    sfx("coin");
    // narratif ciblé : montée de classe > achat emblématique > parfois
    if (classUp) {
      say(N[lang].classUp[newClass]);
      setLevelUp({ n: newClass + 1, cls: CLASSES[lang][newClass], k: Date.now() });
      setTimeout(() => setLevelUp(null), 2100);
      if (newClass === 7 && !wonEmpire) { setWonEmpire(true); setTimeout(() => { setOverlay(null); setScreen("empire"); }, 2200); }
    } else if (tierLine(tier)) say(tierLine(tier));
    else if (Math.random() < 0.28) say(pick(N[lang].buy));
    else say("");
  };
  // achete un porte-bonheur (1 fois) et applique son bonus permanent au RTP
  const buyCharm = (k) => {
    const c = CHARMS[k];
    if (!c || charms[k] || cash < c.price) return;
    setCash((x) => x - c.price);
    setCharms((p) => ({ ...p, [k]: true }));
    sfx("coin");
  };
  const sellFam = (f) => {                        // revente d'urgence : liquide la famille
    const L = lvl[f.id];
    if (L <= 0) return;
    setCash((c) => c + f.tiers[L - 1].resale); setLvl((v) => ({ ...v, [f.id]: 0 }));
    say(pick(N[lang].sell));
    sfx("coin");
  };

  const toggleHold = (r) => {
    if (spinning || screen !== "play" || gameOver) return;
    setHeld((h) => {
      const next = h.slice();
      if (next[r]) { next[r] = false; return next; }                 // déverrouillage : toujours autorisé
      if (next.filter(Boolean).length < holdCharges) next[r] = true; // sinon plafond = jetons dispos
      return next;
    });
  };

  // NUDGE : decale un rouleau de 1 cran apres le spin, recalcule le gain et paie le bonus eventuel
  const nudge = (r, dir) => {
    if (!nudgeAvail || nudgeCharges < 1 || !lastSpin || spinning) return;
    const strip = strips[r];
    const newT = strip.t + dir;
    if (newT < 0 || newT >= strip.cells.length) return;     // garde-fou : on reste dans les cells deja generees
    const newSym = strip.cells[newT];
    // anim courte sur ce rouleau, sans toucher aux autres
    setNudgeAnim((n) => n.map((v, i) => (i === r ? true : v)));
    setStrips((s) => s.map((sv, i) => (i === r ? { cells: sv.cells, t: newT } : sv)));
    setTimeout(() => setNudgeAnim((n) => n.map((v, i) => (i === r ? false : v))), 320);

    const newTargets = lastSpin.targets.slice();
    newTargets[r] = newSym;
    const newRes = evaluate(newTargets);
    const newPayout = newRes.kind > 0 ? Math.round(lastSpin.spend * newRes.mult * lastSpin.lk * lastSpin.scale * (lastSpin.charmBonus || 1)) : 0;
    const delta = newPayout - lastSpin.payout;
    if (delta > 0) {
      setCash((c) => c + delta);
      setLampOn(true); setWinLine(true);
      if (lampTimer.current) clearTimeout(lampTimer.current);
      lampTimer.current = setTimeout(() => setLampOn(false), 3500);
      setWinFx({ a: delta, k: Date.now() });
      setTimeout(() => setWinLine(false), 1400);
      setTimeout(() => setWinFx(null), 2400);
    }
    setLastSpin((p) => ({ ...p, targets: newTargets, payout: Math.max(p.payout, newPayout) }));
    setNudgeCharges((c) => c - 1);
    setNudgeAvail(false);                                   // une seule manip par fenetre
    setRepullAvail(false);                                  // une capacite par fenetre, toutes confondues
    setActiveAbility(null);                                 // capacite desarmee apres usage
    if (delta > 0) setStats((s) => ({ ...s, totalWon: s.totalWon + delta, biggestWin: Math.max(s.biggestWin, newPayout) }));
  };

  // REPULL : un rouleau entier rejoue, les deux autres restent bloques. Re-evalue le combo.
  const repull = (r) => {
    if (!repullAvail || repullCharges < 1 || !lastSpin || spinning || gameOver) return;
    const band = BANDS[r];
    let want = pick(POOL);
    let positions = [];
    for (let i = 0; i < band.length; i++) if (band[i] === want) positions.push(i);
    if (positions.length === 0) { const idx = (Math.random() * band.length) | 0; positions = [idx]; want = band[idx]; }
    const stop = positions[(Math.random() * positions.length) | 0];
    const newSym = bandAt(band, stop);
    const newStrip = makeStrip(band, stop, REEL_RUN_TOTAL);   // meme taille de strip que les spins normaux pour eviter cells[startT] undefined

    // anim de spin uniquement sur ce rouleau : on bloque les autres via spinHeld
    setSpinning(true);
    setSpinHeld([0, 1, 2].map((i) => i !== r));
    setStrips((s) => s.map((sv, i) => (i === r ? newStrip : sv)));
    // Stage 1 = jump au depart, puis cruise court, puis brake. Pour le repull on enchaine direct cruise+brake.
    setReelStage((p) => p.map((s, i) => (i === r ? 1 : s)));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setReelStage((p) => p.map((s, i) => (i === r ? 2 : s)));
      setTimeout(() => {
        setReelStage((p) => p.map((s, i) => (i === r ? 3 : s)));
        setTimeout(() => {
          sfx("reelStop");
          setLanded((p) => p.map((v, i2) => (i2 === r ? true : v)));
          setTimeout(() => setLanded((p) => p.map((v, i2) => (i2 === r ? false : v))), 320);
        }, Math.round(REEL_BRAKE_DUR * 1000 * 0.4));
      }, Math.round(reelCruiseDur(r) * 1000));
    }));

    setTimeout(() => {
      const newTargets = lastSpin.targets.slice();
      newTargets[r] = newSym;
      const newRes = evaluate(newTargets);
      const newPayout = newRes.kind > 0 ? Math.round(lastSpin.spend * newRes.mult * lastSpin.lk * lastSpin.scale * (lastSpin.charmBonus || 1)) : 0;
      const delta = newPayout - lastSpin.payout;
      if (delta > 0) {
        setCash((c) => c + delta);
        setLampOn(true); setWinLine(true);
        if (lampTimer.current) clearTimeout(lampTimer.current);
        lampTimer.current = setTimeout(() => setLampOn(false), 3500);
        setWinFx({ a: delta, k: Date.now() });
        setTimeout(() => setWinLine(false), 1400);
        setTimeout(() => setWinFx(null), 2400);
      }
      setLastSpin((p) => ({ ...p, targets: newTargets, payout: Math.max(p.payout, newPayout) }));
      setRepullCharges((c) => c - 1);
      setRepullAvail(false);
      setNudgeAvail(false);                                 // une seule capacite par fenetre
      setActiveAbility(null);                               // capacite desarmee apres usage
      setReelStage([0, 0, 0]); setSpinning(false); setSpinHeld([false, false, false]);
      if (delta > 0) setStats((s) => ({ ...s, totalWon: s.totalWon + delta, biggestWin: Math.max(s.biggestWin, newPayout) }));
    }, Math.round((reelCruiseDur(r) + REEL_BRAKE_DUR) * 1000) + 100);
  };

  // Quand betIdx est superieur a maxBetIdx (cash a baisse), la mise affichee
  // est plafonnee a maxBetIdx. Le clic '-' part de la mise AFFICHEE, pas du
  // betIdx interne, sinon il faudrait cliquer plusieurs fois sans changement
  // visible avant que la mise baisse vraiment.
  const betDown = () => setBetIdx((i) => Math.max(0, Math.min(i, maxBetIdx) - 1));
  const betUp = () => setBetIdx((i) => Math.min(maxBetIdx, Math.min(i, maxBetIdx) + 1));
  const betMax = () => setBetIdx(maxBetIdx);

  return (
    <div className="lc">

      <div className="lc-bar">
        <div className="lc-cash">
          <i>{t("argent")}</i>
          <div className="lc-cashrow">
            <b>{fmt(cash)}</b>
            {cashLoss && <span className="lc-cashloss" key={cashLoss.k}>-{fmt(cashLoss.amt)}</span>}
          </div>
          {income > 0 && <em>+{fmt(income)}{t("par_tour")}</em>}
        </div>
        <div className="lc-bar-actions">
          <button ref={pauseBtnRef} className="lc-menu" onClick={() => {
            setConfirmReset(false); setCheatSeq([]); setScreen("pause");
            if (tutorial === 3) { setTutorial(0); setTutorialSeen(true); }
          }} aria-label={t("pause")} title={t("pause")}><i /><i /></button>
          {devUnlocked && (
            <button className="lc-dev" onClick={() => setOverlay("dev")} aria-label={t("dev")} title={t("dev")}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                <path fill="currentColor" d="M12 1 L13.5 4 L10.5 4 Z M12 23 L13.5 20 L10.5 20 Z M1 12 L4 13.5 L4 10.5 Z M23 12 L20 13.5 L20 10.5 Z M4.2 4.2 L6.5 6 L4.5 8 L2.5 6.5 Z M19.8 4.2 L17.5 6 L19.5 8 L21.5 6.5 Z M4.2 19.8 L6.5 18 L4.5 16 L2.5 17.5 Z M19.8 19.8 L17.5 18 L19.5 16 L21.5 17.5 Z" />
              </svg>
            </button>
          )}
        </div>
        <div className="lc-level">
          <i>{t("niveau")} {level}</i>
          <b>{socialClass}</b>
          <div className="lc-pips">
            {Array.from({ length: 7 }).map((_, i) => <span key={i} className={"lc-pip" + (i < classIdx ? " on" : "")} />)}
          </div>
        </div>
      </div>

      <div className="lc-head">
        <div className="lc-mark">ONE MORE PULL</div>
        <div className="lc-quip" aria-live="polite">{flash}</div>
      </div>

      {activeAbility && (
        <div className="lc-ability-expl">
          {activeAbility === "hold" ? t("expl_hold") : activeAbility === "nudge" ? t("expl_nudge") : t("expl_repull")}
        </div>
      )}

      {blockedSpin && (
        <div className="lc-ability-expl" key="blocked-msg">{t("expl_broke")}</div>
      )}

      <div className="lc-stage">
      <img src={TABLES[Math.min(classIdx, TABLES.length - 1)]} className={"lc-table t" + Math.min(classIdx, TABLES.length - 1)} alt="" draggable={false} />
      <div className="lc-table-fade" aria-hidden="true" />
      <div className={"lc-machine" + (pressed || blockedSpin ? " shake" : "")} ref={machineRef} style={{ aspectRatio: "870 / 950" }}>
        <img src={IMG} alt="machine" className="lc-img" draggable={false} />
        <img src={UP_SPR} alt="" className="lc-sp" draggable={false} style={{ left: LEV_UP.left + "%", top: LEV_UP.top + "%", width: LEV_UP.w + "%", height: LEV_UP.h + "%", opacity: pressed ? 0 : 1 }} />
        <img src={COVER_SPR} alt="" className="lc-sp" draggable={false} style={{ left: LEV_COVER.left + "%", top: LEV_COVER.top + "%", width: LEV_COVER.w + "%", height: LEV_COVER.h + "%", opacity: pressed ? 1 : 0 }} />
        <img src={PRESS_SPR} alt="" className="lc-sp" draggable={false} style={{ left: LEV_DOWN.left + "%", top: LEV_DOWN.top + "%", width: LEV_DOWN.w + "%", height: LEV_DOWN.h + "%", opacity: pressed ? 1 : 0 }} />
        {REELS.map((R, r) => {
          const canNudge = activeAbility === "nudge" && !spinning && nudgeAvail && nudgeCharges > 0 && screen === "play";
          const canRepull = activeAbility === "repull" && !spinning && repullAvail && repullCharges > 0 && screen === "play";
          const canHold = activeAbility === "hold" && !spinning && screen === "play" && (held[r] || held.filter(Boolean).length < holdCharges);
          return (
            <div
              key={r}
              className={"lc-reel" + (held[r] ? " held" : "") + (canHold ? " holdable" : "") + (canNudge || canRepull ? " nudgable" : "")}
              onClick={canHold ? () => toggleHold(r) : undefined}
              style={{ left: R.l + "%", top: WIN_TOP + "%", width: R.w + "%", height: WIN_H + "%" }}
            >
              <div className="lc-strip" style={{
                transform: "translateY(" + reelY(r) + "px)",
                transition: nudgeAnim[r]
                  ? "transform .3s ease-out"
                  : reelStage[r] === 2
                    ? ("transform " + reelCruiseDur(r) + "s linear")
                    : reelStage[r] === 3
                      ? ("transform " + REEL_BRAKE_DUR + "s cubic-bezier(.4,.4,.25,1.10)")
                      : "none",
              }}>
                <div className={"lc-cellwrap" + (landed[r] ? " landed" : "")}>
                {strips[r].cells.map((k, i) => (
                  <div key={i} className="lc-cell" style={{ height: cellH }}>
                    {cellH > 0 && <Ink k={k} size={symSizeFor(r)} />}
                  </div>
                ))}
                </div>
              </div>
              {held[r] && (
                <div className="lc-lock" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M8.5 11 V7.5 a3.5 3.5 0 0 1 7 0 V11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="6" y="11" width="12" height="10" rx="0.6" fill="none" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="14.6" r="1.4" fill="currentColor" />
                    <rect x="11.2" y="15" width="1.6" height="3.4" fill="currentColor" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
        {/* Boutons NUDGE rendus en siblings des rouleaux, positionnes au-dessus et en-dessous,
            pour ne pas cacher le symbole central. Sens top-to-bottom : ▲ = symbole d'avant, ▼ = symbole suivant. */}
        {REELS.map((R, r) => {
          const canNudge = activeAbility === "nudge" && !spinning && nudgeAvail && nudgeCharges > 0 && screen === "play";
          if (!canNudge) return null;
          return (
            <React.Fragment key={"nb" + r}>
              <button
                className="lc-nudgebtn up"
                onClick={() => nudge(r, +1)}
                aria-label={t("nudge_up")}
                style={{ left: R.l + "%", top: (WIN_TOP - 9) + "%", width: R.w + "%" }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15 L12 8 L19 15" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" strokeLinejoin="miter" /></svg>
              </button>
              <button
                className="lc-nudgebtn dn"
                onClick={() => nudge(r, -1)}
                aria-label={t("nudge_down")}
                style={{ left: R.l + "%", top: (WIN_TOP + WIN_H + 2) + "%", width: R.w + "%" }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9 L12 16 L19 9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" strokeLinejoin="miter" /></svg>
              </button>
            </React.Fragment>
          );
        })}
        {/* Boutons REPULL : siblings des rouleaux, positionnes au premier plan en haut du rouleau,
            hors du overflow:hidden de .lc-reel pour ne pas etre coupes par le cache. */}
        {REELS.map((R, r) => {
          const canRepull = activeAbility === "repull" && !spinning && repullAvail && repullCharges > 0 && screen === "play";
          if (!canRepull) return null;
          return (
            <button
              key={"rb" + r}
              className="lc-repullbtn"
              onClick={(e) => { e.stopPropagation(); repull(r); }}
              aria-label={t("repull_aria")}
              style={{ left: (R.l + R.w / 2) + "%", top: (WIN_TOP - 1) + "%" }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19.5 12 A7.5 7.5 0 1 1 12 4.5" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="square" />
                <polygon points="9 1 15 5 9 9" fill="currentColor" />
              </svg>
            </button>
          );
        })}
        <div className="lc-shadow" style={{ top: WIN_TOP + "%", left: (REELS[0].l - 1.5) + "%", width: (REELS[2].l + REELS[2].w - REELS[0].l + 3) + "%", height: (WIN_H * 0.16) + "%" }} />
        {winLine && <div className="lc-winline" style={{ top: (VIS_TOP + VIS_H / 2) + "%", left: REELS[0].l + "%", width: (REELS[2].l + REELS[2].w - REELS[0].l) + "%" }} />}
        {/* gyrophare : halo + rayons + pièce qui tourne comme une toupie sur un gain */}
        <div className={"lc-dome" + (lampOn ? " on" : "")} />
        <svg className={"lc-rays" + (lampOn ? " on" : "")} viewBox="0 0 720 786" preserveAspectRatio="none" aria-hidden="true">
          <g className="lc-raygrp" stroke="#141414" strokeWidth="3" strokeLinecap="round">
            <line x1="307" y1="32" x2="285" y2="16" /><line x1="297" y1="52" x2="270" y2="49" /><line x1="305" y1="73" x2="283" y2="86" />
            <line x1="416" y1="32" x2="438" y2="16" /><line x1="426" y1="52" x2="453" y2="49" /><line x1="418" y1="73" x2="440" y2="86" />
          </g>
        </svg>
        <div className={"lc-gyrocoin" + (lampOn ? " on" : "")} style={{ width: Math.max(6, machineW * 0.053) + "px", height: Math.max(10, machineW * 0.111) + "px" }}>
          <div className="lc-gc" />
        </div>

        {/* Porte-bonheur achetes : illustrations gravees (PNG transparent) posees sur la machine */}
        {charms.horseshoe && <img src={horseshoeImg} className="lc-charm horseshoe" alt="" draggable={false} />}
        {charms.rabbit && <img src={rabbitImg} className="lc-charm rabbit" alt="" draggable={false} />}
        {charms.clover && <img src={cloverImg} className="lc-charm clover" alt="" draggable={false} />}

        {winFx && (
          <div className="lc-payout" key={winFx.k} style={{ fontSize: Math.max(12, machineW * 0.085) + "px" }}>
            <span className="lc-ring" />
            <span className="lc-pamt">+{fmt(winFx.a)}</span>
          </div>
        )}

        {burst && (
          <div className="lc-burst" style={{ fontSize: Math.max(14, machineW * 0.085) + "px" }}>
            {burst.map((c) => (
              <span key={c.k} className="lc-cn" style={{ ["--dx"]: c.dx + "em", ["--dy"]: c.dy + "em", ["--rot"]: c.rot + "deg", animationDelay: c.delay + "s", fontSize: c.s + "em" }}>$</span>
            ))}
          </div>
        )}

        {screen === "play" && !spinning && (
          <div className="lc-pullhint" aria-hidden="true">
            <svg viewBox="0 0 64 42" preserveAspectRatio="xMidYMid meet">
              <text x="32" y="12" textAnchor="middle" fontFamily="Jost,Arial,sans-serif" fontSize="14" fontWeight="700" letterSpacing="1.5" fill="#141414">PULL</text>
              <path d="M8 19 H56 L32 40 Z" fill="#141414" />
            </svg>
          </div>
        )}
        <button className="lc-lever" onClick={spin} disabled={spinning || gameOver} title={t("pull_lever")} aria-label="pull" />
      </div>
      </div>

      <div className="lc-spacer" aria-hidden="true" />

      <div className="lc-abilities">
        {(holdCharges > 0 || nudgeCharges > 0 || repullCharges > 0 || held.some(Boolean)) && (<>
          {holdCharges > 0 && (
            <button
              className={"lc-abil" + (activeAbility === "hold" ? " on" : "")}
              disabled={spinning || gameOver}
              onClick={() => setActiveAbility((a) => a === "hold" ? null : "hold")}
              title="HOLD"
            >
              <Ink k="bolt" size={16} />
              <span><b>HOLD</b> ×{holdCharges}</span>
            </button>
          )}
          {nudgeCharges > 0 && (
            <button
              className={"lc-abil" + (activeAbility === "nudge" ? " on" : "")}
              disabled={spinning || gameOver || !nudgeAvail}
              onClick={() => setActiveAbility((a) => a === "nudge" ? null : "nudge")}
              title="NUDGE"
            >
              <Ink k="eye" size={16} />
              <span><b>NUDGE</b> ×{nudgeCharges}</span>
            </button>
          )}
          {repullCharges > 0 && (
            <button
              className={"lc-abil" + (activeAbility === "repull" ? " on" : "")}
              disabled={spinning || gameOver || !repullAvail}
              onClick={() => setActiveAbility((a) => a === "repull" ? null : "repull")}
              title="REPULL"
            >
              <Ink k="crown" size={16} />
              <span><b>REPULL</b> ×{repullCharges}</span>
            </button>
          )}
        </>)}
      </div>
      <div className="lc-ctrl">
        {!gameOver && (
          <div className="lc-betwrap">
              <div className="lc-betbar">
                <button className="lc-bb" disabled={betIdx <= 0} onClick={betDown}>–</button>
                <div className="lc-betcoin" title={t("mise")}>
                  <svg className="lc-coinart" viewBox="0 0 100 100" aria-hidden="true">
                    <circle cx="50" cy="52.5" r="47" fill="#141414" />
                    <circle cx="50" cy="50" r="47.5" fill="#fff" stroke="#141414" strokeWidth="2" />
                    <circle cx="50" cy="50" r="44" fill="none" stroke="#141414" strokeWidth="5" strokeDasharray="1.5 3.6" />
                    <circle cx="50" cy="50" r="36" fill="none" stroke="#141414" strokeWidth="1.4" />
                    <path d="M50 20 l1.7 4.6 4.9.3 -3.8 3.1 1.3 4.8 -4.1-2.7 -4.1 2.7 1.3-4.8 -3.8-3.1 4.9-.3z" fill="#141414" />
                    <path d="M50 64 l1.7 4.6 4.9.3 -3.8 3.1 1.3 4.8 -4.1-2.7 -4.1 2.7 1.3-4.8 -3.8-3.1 4.9-.3z" fill="#141414" />
                  </svg>
                  <span className="lc-betnum">{fmt(bet)}</span>
                </div>
                <button className="lc-bb" disabled={betIdx >= maxBetIdx} onClick={betUp}>+</button>
              </div>
              <button className="lc-bmax" onClick={betMax}>{t("mise_max")}</button>
            </div>
        )}
      </div>

      <div className="lc-shopbtns">
        <button ref={buyBtnRef} className="lc-sb" disabled={spinning} onClick={() => {
          setOverlay("buy");
          if (tutorial === 1) { setTutorial(0); setTimeout(() => setTutorial(2), 1500); }
        }}>{t("acheter")}</button>
        <button ref={lifeBtnRef} className="lc-sb" disabled={spinning} onClick={() => {
          setOverlay("assets");
          if (tutorial === 2) { setTutorial(0); setTimeout(() => setTutorial(3), 1500); }
        }}>{t("ma_vie")}{ownedCount ? " · " + ownedCount : ""}</button>
      </div>

      <div className="lc-pay">
        {PAY_ROW.map((k) => (
          <span key={k} className="lc-pr" title={SYM_NAME[k]}><Ink k={k} size={16} faint /> ×{PAY3[k]}</span>
        ))}
        <span className="lc-pr" title="Joker"><Ink k="joker" size={16} faint /> Joker</span>
        <span className="lc-pr danger" title="Skull / Crack"><Ink k="skull" size={16} faint /><Ink k="crack" size={16} faint /> {t("danger")}</span>
      </div>

      {screen === "intro" && (
        <Ovl kind="intro"><div className="lc-modal intro">
          <div className="lc-mt-big">ONE MORE<br/>PULL</div>
          <p className="lc-ms-big">{t("derniere_piece")}</p>
          <div className="lc-intro-body">
            <p>{t("intro_p1")}</p>
            <p>{t("intro_p2")}</p>
            <p>{t("intro_p3")}</p>
            <p>{t("intro_p4")}</p>
          </div>
          <div className="lc-onecoin">
            <span>{t("il_te_reste")}</span>
            <b>{t("une_piece")}</b>
          </div>
          <button className="lc-btn big" onClick={() => { setStarted(true); setScreen("play"); }}>{t("inserer_piece")}</button>
          <p className="lc-disc">{t("disclaimer")}</p>
        </div></Ovl>
      )}

      {screen === "pause" && (
        <Ovl><div className="lc-modal">
          <div className="lc-mh">{t("pause").toUpperCase()}</div>
          <p className="lc-ms">{t("niveau")} {level} · {socialClass} · {fmt(netWorth)}</p>
          {!confirmReset ? (
            <>
              <div className="lc-statbox">
                <div className="lc-stat-row"><span>{t("tours_joues")}</span><b>{pulls}</b></div>
                <div className="lc-stat-row"><span>{t("plus_gros_gain")}</span><b>{fmt(stats.biggestWin)}</b></div>
                <div className="lc-stat-row"><span>{t("peak_patrim")}</span><b>{fmt(stats.peakWorth)}</b></div>
                <div className="lc-stat-row"><span>{t("statut_social")}</span><b>{CLASSES[lang][stats.peakClass || 0]}</b></div>
                <div className="lc-stat-row"><span>{t("cartes_obt")}</span><b>{stats.cardsEarned}</b></div>
              </div>
              <div className="lc-statbox lc-record">
                <div className="lc-recordhead">{t("record")}</div>
                <div className="lc-stat-row"><span>{t("record_patrim")}</span><b>{fmt(best.peakWorth)}</b></div>
                <div className="lc-stat-row"><span>{t("record_gain")}</span><b>{fmt(best.biggestWin)}</b></div>
                <div className="lc-stat-row"><span>{t("statut_social")}</span><b>{CLASSES[lang][best.peakClass || 0]}</b></div>
              </div>
              <div className="lc-menucol">
                <button className="lc-btn" onClick={() => { setCheatSeq([]); setScreen("play"); }}>{t("reprendre")}</button>
                <button className="lc-btn ghost" onClick={() => {
                  if (pushCheat("regles")) { setDevUnlocked((v) => !v); }
                  else { setScreen("play"); setOverlay("rules"); }
                }}>{t("regles")}</button>
                <button className="lc-btn ghost" onClick={() => { pushCheat("son"); setSoundOn((s) => !s); }}>{t("son")} · {soundOn ? t("on") : t("off")}</button>
                <button className="lc-btn ghost" onClick={() => { pushCheat("langue"); setLang((l) => l === "fr" ? "en" : "fr"); }}>{t("langue")} · {lang === "fr" ? "FR" : "EN"}</button>
                <button className="lc-btn ghost" onClick={() => setConfirmReset(true)}>{t("recommencer")}</button>
              </div>
            </>
          ) : (
            <div className="lc-menucol">
              <p className="lc-confirm">{t("confirm_reset").split("|").map((s, i) => <React.Fragment key={i}>{s}{i < 2 ? <br/> : null}</React.Fragment>)}</p>
              <button className="lc-btn" onClick={newGame}>{t("oui")}</button>
              <button className="lc-btn ghost" onClick={() => setConfirmReset(false)}>{t("non")}</button>
            </div>
          )}
          <p className="lc-disc">{t("disclaimer")}</p>
        </div></Ovl>
      )}

      {overlay === "buy" && (
        <Ovl><div className="lc-modal wide">
          <p className="lc-el">{t("ma_vie_improve")}</p>
          <div className="lc-en">{t("monte_classe")}</div>
          <p className="lc-ms">{t("cash")} : {fmt(cash)} · {t("buy_explain")}</p>
          <div className="lc-list">
            {FAM.map((f) => {
              const L = lvl[f.id];
              const cur = L > 0 ? f.tiers[L - 1] : null;
              const next = L < f.tiers.length ? f.tiers[L] : null;
              const netCost = next ? next.price - (cur ? cur.resale : 0) : 0;
              const ok = next && cash >= netCost;
              return (
                <div className="lc-fam" key={f.id}>
                  <div className="lc-famh">{famName(f)}{f.life ? "" : " · " + t("revenu")}<span>{cur ? tierName(cur) : famStart(f)}</span></div>
                  {next
                    ? <button className={"lc-up" + (ok ? "" : " off")} disabled={!ok} onClick={() => buyNext(f)}>
                        <span className="lc-upn">{tierName(next)}{next.inc ? " · +" + fmt(next.inc) + t("par_tour") : ""}{cur ? <i>{t("remplace")} {tierName(cur)}</i> : null}</span>
                        <span className="lc-upp">{fmt(netCost)}</span>
                      </button>
                    : <div className="lc-max">{t("max_atteint")}</div>}
                </div>
              );
            })}
            <div className="lc-famh">{t("charms_title")}<span>{t("charms_sub")}</span></div>
            {CHARM_KEYS.map((k) => {
              const c = CHARMS[k];
              const owned = charms[k];
              const ok = !owned && cash >= c.price;
              const pctBonus = Math.round((c.bonus - 1) * 100);
              return (
                <button
                  key={k}
                  className={"lc-up" + (ok ? "" : " off")}
                  disabled={!ok}
                  onClick={() => buyCharm(k)}
                >
                  <span className="lc-upn">{c[lang]} · +{pctBonus}% {t("chance")}{owned ? <i>{t("possede")}</i> : null}</span>
                  <span className="lc-upp">{owned ? "✓" : fmt(c.price)}</span>
                </button>
              );
            })}
          </div>
          <button className="lc-btn" onClick={() => setOverlay(null)}>{t("retour")}</button>
        </div></Ovl>
      )}

      {overlay === "assets" && (
        <Ovl><div className="lc-modal wide">
          <p className="lc-el">{t("ma_vie")}</p>
          <div className="lc-en">{socialClass}</div>
          <p className="lc-ms">{t("niveau")} {level} · {venue} · {t("patrimoine")} {fmt(netWorth)}{income > 0 ? " · +" + fmt(income) + t("par_tour") : ""}</p>
          <div className="lc-list">
            {FAM.map((f) => {
              const L = lvl[f.id];
              const cur = L > 0 ? f.tiers[L - 1] : null;
              return (
                <div key={f.id} className="lc-row own">
                  <span className="lc-rn">{cur ? tierName(cur) : famStart(f)}<i>{famName(f)}{cur && cur.inc ? " · +" + fmt(cur.inc) + t("par_tour") : ""}</i></span>
                  {cur
                    ? <button className="lc-sell" onClick={() => sellFam(f)}>{t("vendre")} · {fmt(cur.resale)}</button>
                    : <span className="lc-rp">—</span>}
                </div>
              );
            })}
          </div>
          <p className="lc-disc" style={{ marginBottom: 18 }}>{t("sell_warn")}</p>
          <button className="lc-btn" onClick={() => setOverlay(null)}>{t("retour")}</button>
        </div></Ovl>
      )}

      {overlay === "rules" && (
        <Ovl><div className="lc-modal wide">
          <p className="lc-el">{t("regles")}</p>
          <div className="lc-en">{t("comment")}</div>
          <p className="lc-ms">{t("rules_short")}</p>
          <div className="lc-list">
            <div className="lc-acth">{t("symboles")}</div>
            {SYM_INFO[lang].map(([k, desc]) => {
              const cardSym = k === "bolt" ? "HOLD" : k === "eye" ? "NUDGE" : k === "crown" ? "REPULL" : null;
              const triple = lang === "en" ? "triple" : "triple";
              const pair = lang === "en" ? "pair" : "paire";
              const card = lang === "en" ? "card" : "carte";
              const cards = lang === "en" ? "cards" : "cartes";
              return (
              <div key={k} className="lc-rule">
                <Ink k={k} size={26} />
                <div className="lc-rule-txt">
                  <b>{SYM_NAME[k]}{PAY3[k] && !NEG[k] && k !== "joker" ? (
                    <em className="lc-mult">
                      {" · " + triple + " = "}<b className="lc-mv">×{PAY3[k]}</b>
                      {cardSym ? <b className="lc-mv">{" + 2 " + cards + " " + cardSym}</b> : null}
                      {PAY2[k] ? <>
                        {" · " + pair + " = "}<b className="lc-mv">×{PAY2[k]}</b>
                        {cardSym ? <b className="lc-mv">{" + 1 " + card + " " + cardSym}</b> : null}
                      </> : null}
                    </em>
                  ) : null}</b>
                  <i>{boldMarks(desc)}</i>
                </div>
              </div>
              );
            })}
            <div className="lc-acth">{t("combinaisons")}</div>
            <div className="lc-combo"><b>{t("c_3")}</b><i>{t("c_3_d")}</i></div>
            <div className="lc-combo"><b>{t("c_2")}</b><i>{t("c_2_d")}</i></div>
            <div className="lc-combo"><b>{t("c_2j")}</b><i>{t("c_2j_d")}</i></div>
            <div className="lc-combo"><b>{t("c_3j")}</b><i>{t("c_3j_d")} ×{PAY3.joker}</i></div>
            <div className="lc-combo"><b>{t("c_skull_2")}</b><i>{t("c_skull_2_d")}</i></div>
            <div className="lc-combo"><b>{t("c_skull_3")}</b><i>{t("c_skull_3_d")}</i></div>
            <div className="lc-combo"><b>{t("c_crack_2")}</b><i>{t("c_crack_2_d")}</i></div>
            <div className="lc-combo"><b>{t("c_crack_3")}</b><i>{t("c_crack_3_d")}</i></div>

            <div className="lc-acth">{t("hold_t")}</div>
            <div className="lc-rule">
              <Ink k="bolt" size={26} />
              <div className="lc-rule-txt"><b>{t("hold_cards")}</b><i>{t("hold_d")}</i></div>
            </div>
            <div className="lc-acth">{t("nudge_t")}</div>
            <div className="lc-rule">
              <Ink k="eye" size={26} />
              <div className="lc-rule-txt"><b>{t("nudge_cards")}</b><i>{t("nudge_d")}</i></div>
            </div>
            <div className="lc-acth">{t("repull_t")}</div>
            <div className="lc-rule">
              <Ink k="crown" size={26} />
              <div className="lc-rule-txt"><b>{t("repull_cards")}</b><i>{t("repull_d")}</i></div>
            </div>
          </div>
          <p className="lc-ms">{t("rules_foot")}</p>
          <button className="lc-btn" onClick={() => setOverlay(null)}>{t("retour")}</button>
        </div></Ovl>
      )}

      {overlay === "dev" && (
        <Ovl><div className="lc-modal wide">
          <p className="lc-el">{t("dev")}</p>
          <div className="lc-en">DEV</div>
          <p className="lc-ms">{t("dev_lead")}</p>
          <div className="lc-devlist">
            <div className="lc-devgroup">
              <div className="lc-devheader">{t("dev_money")}</div>
              <div className="lc-devbtns">
                <button onClick={() => setCash((c) => c + 100)}>+100$</button>
                <button onClick={() => setCash((c) => c + 1000)}>+1K$</button>
                <button onClick={() => setCash((c) => c + 10000)}>+10K$</button>
                <button onClick={() => setCash((c) => c + 100000)}>+100K$</button>
                <button onClick={() => setCash((c) => c + 1000000)}>+1M$</button>
                <button onClick={() => setCash((c) => c + 10000000)}>+10M$</button>
                <button onClick={() => setCash(1)}>{t("dev_reset_cash")}</button>
              </div>
            </div>
            <div className="lc-devgroup">
              <div className="lc-devheader">{t("dev_cards")}</div>
              <div className="lc-devbtns">
                <button onClick={() => setHoldCharges((c) => Math.min(9, c + 1))}>+1 HOLD</button>
                <button onClick={() => setNudgeCharges((c) => Math.min(9, c + 1))}>+1 NUDGE</button>
                <button onClick={() => setRepullCharges((c) => Math.min(3, c + 1))}>+1 REPULL</button>
                <button onClick={() => { setHoldCharges(9); setNudgeCharges(9); setRepullCharges(3); }}>{t("dev_max_all")}</button>
                <button onClick={() => { setHoldCharges(0); setNudgeCharges(0); setRepullCharges(0); }}>{t("dev_clear")}</button>
              </div>
            </div>
            <div className="lc-devgroup">
              <div className="lc-devheader">{t("charms_title")}</div>
              <div className="lc-devbtns">
                {CHARM_KEYS.map((k) => (
                  <button key={k} onClick={() => setCharms((p) => ({ ...p, [k]: !p[k] }))}>
                    {CHARMS[k][lang]} {charms[k] ? "✓" : "·"}
                  </button>
                ))}
                <button onClick={() => setCharms({ clover: true, horseshoe: true, rabbit: true })}>{t("dev_max_all")}</button>
                <button onClick={() => setCharms({ ...CHARMS_0 })}>{t("dev_clear")}</button>
              </div>
            </div>
            <div className="lc-devgroup">
              <div className="lc-devheader">{t("dev_screens")}</div>
              <div className="lc-devbtns">
                <button onClick={() => { setOverlay(null); setScreen("intro"); }}>{t("dev_intro")}</button>
                <button onClick={() => { setOverlay(null); setScreen("empire"); }}>{t("dev_empire")}</button>
                <button onClick={() => { setOverlay(null); setScreen("over"); }}>{t("dev_over")}</button>
              </div>
            </div>
          </div>
          <button className="lc-btn" onClick={() => setOverlay(null)}>{t("retour")}</button>
        </div></Ovl>
      )}

      {screen === "empire" && (
        <Ovl><div className="lc-modal">
          <div className="lc-mh">{t("empire")}</div>
          <p className="lc-ms">{t("empire_sub")}</p>
          <p className="lc-mb">{t("empire_lead")}</p>
          <div className="lc-statbox">
            <div className="lc-stat-row"><span>{t("tours_joues")}</span><b>{pulls}</b></div>
            <div className="lc-stat-row"><span>{t("plus_gros_gain")}</span><b>{fmt(stats.biggestWin)}</b></div>
            <div className="lc-stat-row"><span>{t("peak_patrim")}</span><b>{fmt(stats.peakWorth)}</b></div>
            <div className="lc-stat-row"><span>{t("cartes_obt")}</span><b>{stats.cardsEarned}</b></div>
            <div className="lc-stat-row"><span>{t("net")}</span><b>{fmt(stats.totalWon - stats.totalBet)}</b></div>
          </div>
          <p className="lc-finaltag">{t("empire_tag").split("|").map((s, i) => <React.Fragment key={i}>{s}{i === 0 ? <br/> : null}</React.Fragment>)}</p>
          <div className="lc-crow">
            <button className="lc-btn" onClick={() => setScreen("play")}>{t("encore_tour")}</button>
            <button className="lc-btn ghost" onClick={newGame}>{t("recommencer")}</button>
          </div>
        </div></Ovl>
      )}

      {screen === "over" && (
        <Ovl><div className="lc-modal">
          <div className="lc-mh">{t("over")}</div>
          <p className="lc-ms">{t("over_sub")}</p>
          {gameOverReason === "crack" && <p className="lc-over-reason">{t("over_reason_crack")}</p>}
          <div className="lc-statbox">
            <div className="lc-stat-row"><span>{t("tours_joues")}</span><b>{pulls}</b></div>
            <div className="lc-stat-row"><span>{t("plus_gros_gain")}</span><b>{fmt(stats.biggestWin)}</b></div>
            <div className="lc-stat-row"><span>{t("peak_patrim")}</span><b>{fmt(stats.peakWorth)}</b></div>
            <div className="lc-stat-row"><span>{t("cartes_obt")}</span><b>{stats.cardsEarned}</b></div>
            <div className="lc-stat-row"><span>{t("net")}</span><b>{fmt(stats.totalWon - stats.totalBet)}</b></div>
          </div>
          <p className="lc-finaltag">{t("over_tag").split("|").map((s, i) => <React.Fragment key={i}>{s}{i === 0 ? <br/> : null}</React.Fragment>)}</p>
          <button className="lc-btn" onClick={newGame}>{t("recommencer")}</button>
        </div></Ovl>
      )}

      {levelUp && (
        <div className="lc-levelup" key={levelUp.k}>
          <div className="lc-lu-l">{t("niveau")} {levelUp.n} · {t("nouveau_statut")}</div>
          <div className="lc-lu-n">{levelUp.cls}</div>
        </div>
      )}

      {tutorial === 1 && (
        <TutorialBubble targetRef={buyBtnRef} side="above"
          text={t("tut_buy")}
          onDismiss={() => { setTutorial(0); setTimeout(() => setTutorial(2), 1500); }} />
      )}
      {tutorial === 2 && (
        <TutorialBubble targetRef={lifeBtnRef} side="above"
          text={t("tut_life")}
          onDismiss={() => { setTutorial(0); setTimeout(() => setTutorial(3), 1500); }} />
      )}
      {tutorial === 3 && (
        <TutorialBubble targetRef={pauseBtnRef} side="below"
          text={t("tut_pause")}
          onDismiss={() => { setTutorial(0); setTutorialSeen(true); }} />
      )}

      {cardNotif && (
        <div className="lc-cardnotif" key={cardNotif.k}>
          <Ink k={cardNotif.type === "repull" ? "crown" : cardNotif.type === "nudge" ? "eye" : "bolt"} size={32} />
          <div className="lc-cn-body">
            <span className="lc-cn-l">{t("carte")} {cardNotif.type === "repull" ? "REPULL" : cardNotif.type === "nudge" ? "NUDGE" : "HOLD"}</span>
            <span className="lc-cn-n">+{cardNotif.n}</span>
          </div>
        </div>
      )}
    </div>
  );
}
function Ovl({ children, kind }) { return <div className={"lc-ovl" + (kind ? " lc-ovl-" + kind : "")}>{children}</div>; }

// Bulle minimaliste avec queue pointant vers un bouton (utilise pour le tutorial).
// side='above' : bulle au-dessus du bouton, queue en bas pointant vers le bas
// side='below' : bulle en dessous du bouton, queue en haut pointant vers le haut
//
// Implementation : pour 'above' on positionne le POINT D'ANCRAGE 12px au-dessus
// du bouton et on utilise transform:translateY(-100%) pour faire grandir la
// bulle vers le haut depuis ce point -- comme ca la hauteur reelle de la bulle
// n'a pas besoin d'etre connue avant le rendu, donc pas de saut visuel.
function TutorialBubble({ targetRef, side, text, onDismiss }) {
  const [pos, setPos] = useState(null);
  // Auto-dismiss apres 8s si l'utilisateur n'a rien fait
  useEffect(() => {
    const id = setTimeout(() => onDismiss && onDismiss(), 8000);
    return () => clearTimeout(id);
  }, [onDismiss]);
  useLayoutEffect(() => {
    const update = () => {
      if (!targetRef.current) return;
      const r = targetRef.current.getBoundingClientRect();
      setPos({ cx: r.left + r.width / 2, top: r.top, bottom: r.bottom });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [targetRef]);
  if (!pos) return null;
  const BUBBLE_W = 280;
  const MARGIN = 12;
  let left = pos.cx - BUBBLE_W / 2;
  left = Math.max(MARGIN, Math.min(window.innerWidth - BUBBLE_W - MARGIN, left));
  const arrowX = pos.cx - left;
  // Pour 'above' : anchor a target.top - 12, bulle pousse vers le haut via translateY(-100%).
  // Pour 'below' : anchor a target.bottom + 12, bulle pousse vers le bas (transform nul).
  const style = side === "above"
    ? { left, top: pos.top - 12, width: BUBBLE_W, transform: "translateY(-100%)", "--arrow-x": arrowX + "px" }
    : { left, top: pos.bottom + 12, width: BUBBLE_W, "--arrow-x": arrowX + "px" };
  return (
    <div className={"lc-tut " + side} style={style} onClick={onDismiss}>
      <div className="lc-tut-text">{text}</div>
      <div className="lc-tut-ok">OK</div>
    </div>
  );
}

