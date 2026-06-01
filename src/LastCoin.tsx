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
   LAST COIN — machine à sous narrative. Une pièce → un empire.
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
KEYS.forEach((k) => { URI[k] = symSVG(k, "#141414"); URI_F[k] = symSVG(k, "#b4b4b4"); });
function Ink({ k, size, faint }) {
  return <img src={(faint ? URI_F : URI)[k]} width={size} height={size} alt="" draggable={false} style={{ display: "block" }} />;
}
const SYM_NAME = { coin: "Coin", star: "Star", house: "House", diamond: "Diamond", crown: "Crown", bolt: "Bolt", eye: "Eye", joker: "Joker", skull: "Skull", crack: "Crack" };
const SYM_INFO = {
  fr: [
    ["coin",  "gain de base"],
    ["star",  "chance — gain supérieur"],
    ["house", "patrimoine"],
    ["diamond", "luxe — pierre précieuse"],
    ["crown", "revanche — gros gain · paire = 1 carte REPULL (rare, max 3)"],
    ["bolt",  "machine — paire = 1 carte HOLD · triple = 2 cartes (max 9)"],
    ["eye",   "prédiction — paire = 1 carte NUDGE · triple = 2 cartes (max 9)"],
    ["joker", "WILD — remplace n'importe quel symbole · 3 = jackpot"],
    ["skull", "DANGER — 2 alignés = -50% cash · 3 alignés = ruine totale"],
    ["crack", "DANGER — 2 alignés = -25% cash · 3 alignés = fin de partie"],
  ],
  en: [
    ["coin",  "base payout"],
    ["star",  "luck — higher payout"],
    ["house", "wealth"],
    ["diamond", "luxury — precious stone"],
    ["crown", "revenge — big win · pair = 1 REPULL card (rare, max 3)"],
    ["bolt",  "machine — pair = 1 HOLD card · triple = 2 cards (max 9)"],
    ["eye",   "prediction — pair = 1 NUDGE card · triple = 2 cards (max 9)"],
    ["joker", "WILD — replaces any symbol · 3 = jackpot"],
    ["skull", "DANGER — 2 aligned = -50% cash · 3 aligned = total ruin"],
    ["crack", "DANGER — 2 aligned = -25% cash · 3 aligned = game over"],
  ],
};

// ===== Table de gains (multiplicateurs de mise) =====
// 3 identiques (le joker complète) :
const PAY3 = { coin: 11, star: 16, house: 23, diamond: 35, crown: 120, bolt: 16, eye: 20, joker: 156 };
// 2 identiques sans joker (petit gain) :
const PAY2 = { coin: 2, star: 3, house: 4, diamond: 5, crown: 13, bolt: 3, eye: 3 };
const NEG = { skull: true, crack: true };           // symboles "danger"
const PAY_ROW = ["coin", "star", "house", "diamond", "crown"]; // affichés dans la mini-table

function evaluate(t) {
  const jokers = t.filter((s) => s === "joker").length;
  const non = t.filter((s) => s !== "joker");
  if (jokers === 3) return { kind: 3, sym: "joker", mult: PAY3.joker };
  const f = {}; non.forEach((s) => { f[s] = (f[s] || 0) + 1; });
  const ent = Object.entries(f).sort((a, b) => b[1] - a[1]);
  const [topSym, topCnt] = ent[0];
  // Skull / Crack : 2 ou 3 alignes declenchent un effet punitif (le joker ne les complete pas)
  if (NEG[topSym] && topCnt >= 2) return { kind: -1, sym: topSym, count: topCnt };
  // 3 identiques (avec completion joker)
  if (topCnt + jokers >= 3 && !NEG[topSym]) return { kind: 3, sym: topSym, mult: PAY3[topSym] };
  // paire positive
  if (topCnt === 2 && !NEG[topSym]) return { kind: 2, sym: topSym, mult: PAY2[topSym] };
  return { kind: 0 };
}

// ===== Économie =====
const SAVE_KEY = "lastcoin.v2";
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
const BAND_W = { coin: 7, star: 4, house: 3, diamond: 3, bolt: 3, eye: 2, joker: 2, skull: 3, crack: 3, crown: 1 };
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

// ===== Narratif (FR + punchlines EN). Rare et ciblé : surtout aux moments forts. =====
const N = {
  fr: {
    first:   ["La machine recrache assez de pièces pour un repas."],
    jackpot: ["Trois jokers. La machine ricane, maintenant.", "Triple joker. Le hasard te fait une faveur presque obscène."],
    big:     ["Les néons du garage vacillent. La machine sourit.", "Gros. La machine te regarde, soudain intéressée.", "Un éclat. Pour une fois, le sort t'a choisi."],
    win:     ["Le bac tinte. Petit miracle.", "Assez pour tenir un jour de plus.", "Les rouleaux sont d'accord, pour une fois.", "Tu y crois presque."],
    lose:    ["Les rouleaux s'arrêtent. Ton souffle aussi.", "Rien. Le silence pèse une tonne.", "La machine ne te doit rien."],
    skull:   ["Trois crânes. La ruine te frôle."],
    crack:   ["La machine tousse, se bloque, repart."],
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
    first:   ["The machine spits out enough coins for a meal."],
    jackpot: ["Three jokers. The machine sneers now.", "Triple joker. Luck gives you an almost obscene favor."],
    big:     ["The garage neons flicker. The machine smiles.", "Big. The machine looks at you, suddenly interested.", "A flash. For once, fate has picked you."],
    win:     ["The tray chimes. Small miracle.", "Enough to last one more day.", "The reels agree, for once.", "You almost believe it."],
    lose:    ["The reels stop. So does your breath.", "Nothing. The silence weighs a ton.", "The machine owes you nothing."],
    skull:   ["Three skulls. Ruin brushes by."],
    crack:   ["The machine coughs, jams, restarts."],
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


// ===== I18N : table de traduction FR / EN, lookup via t(key) en runtime =====
const T = {
  // header
  argent:        { fr: "argent",         en: "money" },
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
  peak_patrim:   { fr: "patrimoine peak",     en: "peak wealth" },
  cartes_obt:    { fr: "cartes obtenues",     en: "cards earned" },
  net:           { fr: "net",                 en: "net" },
  // intro
  last_coin:     { fr: "LAST COIN",      en: "LAST COIN" },
  derniere_piece:{ fr: "la dernière pièce", en: "the last coin" },
  intro_p1:      { fr: "Tu vis dans un garage.",
                   en: "You live in a garage." },
  intro_p2:      { fr: "Plus de boulot, plus de couple, plus d'argent.",
                   en: "No job, no partner, no money." },
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
  sell_warn:     { fr: "la revente fait mal — tu repars de zéro dans la famille",
                   en: "selling hurts — you start from zero in this family" },
  // rules
  comment:       { fr: "comment ça marche", en: "how it works" },
  rules_short:   { fr: "mise · tire le levier · encaisse ou re-risque",
                   en: "bet · pull the lever · cash in or re-risk" },
  symboles:      { fr: "symboles",          en: "symbols" },
  combinaisons:  { fr: "combinaisons",      en: "combinations" },
  c_3:           { fr: "3 identiques",      en: "3 of a kind" },
  c_3_d:         { fr: "gain selon le symbole (×3 à ×75)",
                   en: "payout depends on symbol (×3 to ×75)" },
  c_2:           { fr: "2 identiques",      en: "2 of a kind" },
  c_2_d:         { fr: "petit gain (paire)", en: "small win (pair)" },
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
const STATS0 = { biggestWin: 0, peakWorth: 0, cardsEarned: 0, totalBet: 0, totalWon: 0 };

export default function LastCoin() {
  const initRef = useRef(null);
  if (!initRef.current) initRef.current = loadSave() || {};
  const init = initRef.current;

  const [screen, setScreen] = useState(() => (init.cash != null ? "play" : "intro"));
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
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cash, lvl, charms, betIdx, pulls, gameOver, gameOverReason, empire: wonEmpire, holdCharges, nudgeCharges, repullCharges, stats, soundOn, lang, devUnlocked })); } catch {}
  }, [cash, lvl, charms, betIdx, pulls, gameOver, gameOverReason, wonEmpire, holdCharges, nudgeCharges, repullCharges, stats, soundOn, lang, devUnlocked]);

  // peak du patrimoine : suivi en permanence des qu'il monte (acceuil cash + achats)
  useEffect(() => {
    setStats((s) => (netWorth > s.peakWorth ? { ...s, peakWorth: netWorth } : s));
  }, [netWorth]);

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
    setOverlay(null); setConfirmReset(false); setScreen("intro");   // repasse par l'intro pour rappeler le contexte
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

    const first = pulls === 0;
    const big = res.kind === 3 && res.mult >= 20;
    setLastWin(payout > 0 ? { amount: payout, big } : res.kind === -1 ? { neg: res.sym, count: res.count } : { amount: 0 });
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

    // narratif : rare et ciblé (toujours sur 1er gain / jackpot / gros gain / danger ; sinon faible chance)
    const NL = N[lang];
    if (first) say(NL.first[0]);
    else if (res.kind === 3 && res.sym === "joker") say(pick(NL.jackpot));
    else if (big) say(pick(NL.big));
    else if (res.kind === -1) say(res.sym === "skull" ? pick(NL.skull) : pick(NL.crack));
    else if (payout > 0) say(Math.random() < 0.10 ? pick(NL.win) : "");
    else say(Math.random() < 0.05 ? pick(NL.lose) : "");
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

  const betDown = () => setBetIdx((i) => Math.max(0, i - 1));
  const betUp = () => setBetIdx((i) => Math.min(maxBetIdx, i + 1));
  const betMax = () => setBetIdx(maxBetIdx);

  return (
    <div className="lc">
      <style>{CSS}</style>

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
          <button className="lc-menu" onClick={() => { setConfirmReset(false); setCheatSeq([]); setScreen("pause"); }} aria-label={t("pause")} title={t("pause")}><i /><i /></button>
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
        <div className="lc-mark">LAST COIN</div>
        <div className="lc-sub">{venue}</div>
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
                aria-label="nudge haut"
                style={{ left: R.l + "%", top: (WIN_TOP - 9) + "%", width: R.w + "%" }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15 L12 8 L19 15" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" strokeLinejoin="miter" /></svg>
              </button>
              <button
                className="lc-nudgebtn dn"
                onClick={() => nudge(r, -1)}
                aria-label="nudge bas"
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
              aria-label="rejouer ce rouleau"
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
        <button className="lc-lever" onClick={spin} disabled={spinning || gameOver} title="tire le levier" aria-label="pull" />
      </div>
      </div>

      <div className="lc-readout">
        {gameOver
          ? <span className="lc-neg">{t("broken_msg")}</span>
          : (bet < 1 && hasAssets && screen === "play")
          ? <span className="lc-neg">{t("broke_msg")}</span>
          : flash ? <span className="lc-flash">{flash}</span>
          : (lastWin && lastWin.neg) ? <span className="lc-neg">{
              lastWin.neg === "skull" ? (lastWin.count === 3 ? t("skull_3_msg") : t("skull_2_msg"))
                                      : (lastWin.count === 3 ? t("crack_3_msg") : t("crack_2_msg"))
            }</span>
          : null}
      </div>

      {(holdCharges > 0 || nudgeCharges > 0 || repullCharges > 0 || held.some(Boolean)) && (
        <div className="lc-abilities">
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
        </div>
      )}
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
        <button className="lc-sb" disabled={spinning} onClick={() => setOverlay("buy")}>{t("acheter")}</button>
        <button className="lc-sb" disabled={spinning} onClick={() => setOverlay("assets")}>{t("ma_vie")}{ownedCount ? " · " + ownedCount : ""}</button>
      </div>

      <div className="lc-pay">
        {PAY_ROW.map((k) => (
          <span key={k} className="lc-pr" title={SYM_NAME[k]}><Ink k={k} size={16} faint /> ×{PAY3[k]}</span>
        ))}
        <span className="lc-pr" title="Joker"><Ink k="joker" size={16} faint /> {t("wild")}</span>
        <span className="lc-pr danger" title="Skull / Crack"><Ink k="skull" size={16} faint /> {t("danger")}</span>
      </div>

      {screen === "intro" && (
        <Ovl><div className="lc-modal intro">
          <div className="lc-mt-big">LAST<br/>COIN</div>
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
          <button className="lc-btn big" onClick={() => setScreen("play")}>{t("inserer_piece")}</button>
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
                <div className="lc-stat-row"><span>{t("cartes_obt")}</span><b>{stats.cardsEarned}</b></div>
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
            {SYM_INFO[lang].map(([k, desc]) => (
              <div key={k} className="lc-rule">
                <Ink k={k} size={26} />
                <div className="lc-rule-txt">
                  <b>{SYM_NAME[k]}{PAY3[k] && !NEG[k] && k !== "joker" ? " · ×" + PAY3[k] : ""}</b>
                  <i>{desc}</i>
                </div>
              </div>
            ))}
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
function Ovl({ children }) { return <div className="lc-ovl">{children}</div>; }

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;-webkit-tap-highlight-color:transparent;}
.lc{min-height:100vh;width:100%;background:#fafafa;color:#141414;display:flex;flex-direction:column;
  align-items:center;justify-content:flex-start;gap:13px;padding:22px 20px 44px;overflow-x:hidden;
  font-family:'Jost',-apple-system,sans-serif;font-weight:300;}
.lc-bar{width:100%;max-width:330px;display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:flex-start;gap:12px;}
.lc-barleft{display:flex;align-items:flex-start;gap:11px;}
.lc-bar-actions{display:flex;gap:6px;align-items:center;align-self:center;}
.lc-menu{display:flex;gap:3px;align-items:center;justify-content:center;width:28px;height:28px;border:1px solid #141414;background:none;cursor:pointer;padding:0;flex-shrink:0;transition:.15s;}
.lc-menu i{width:3px;height:11px;background:#141414;display:block;transition:.15s;}
.lc-menu:hover{background:#141414;}
.lc-menu:hover i{background:#fff;}
.lc-dev{width:28px;height:28px;border:1px dashed #141414;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;color:#141414;font-family:inherit;flex-shrink:0;transition:.15s;}
.lc-dev svg{width:14px;height:14px;display:block;}
.lc-dev:hover{background:#141414;color:#fff;}
.lc-devlist{display:flex;flex-direction:column;gap:14px;text-align:left;margin:14px 0 20px;}
.lc-devheader{font-size:9px;letter-spacing:3px;color:#7f7f7f;text-transform:uppercase;padding:4px 0 5px;border-bottom:1px solid #f0f0f0;margin-bottom:8px;}
.lc-devbtns{display:flex;gap:6px;flex-wrap:wrap;}
.lc-devbtns button{background:none;border:1px solid #d9d9d9;color:#555;cursor:pointer;font-family:inherit;font-size:11px;letter-spacing:1px;padding:6px 10px;transition:.15s;}
.lc-devbtns button:hover{border-color:#141414;color:#141414;background:#fafafa;}
.lc-menucol{display:flex;flex-direction:column;gap:10px;align-items:center;margin:4px 0 2px;}
.lc-menucol .lc-btn{width:220px;min-width:0;padding:11px 0;text-align:center;letter-spacing:4px;}
.lc-cash{display:flex;flex-direction:column;align-items:flex-start;position:relative;}
.lc-cash>i{font-style:normal;font-size:9px;letter-spacing:2px;color:#787878;text-transform:uppercase;}
.lc-cash b{font-weight:600;font-size:27px;letter-spacing:1px;line-height:1.02;}
/* Animation 'evaporation' : montant rouge qui flotte au-dessus du cash et fade out */
/* Conteneur de la ligne 'argent' : flex en ligne pour ancrer le delta a droite du montant */
.lc-cashrow{position:relative;display:inline-flex;align-items:flex-end;}
/* Montant perdu : apparait a droite du cash, monte et fade out */
.lc-cashloss{position:absolute;left:100%;bottom:0;margin-left:10px;font-weight:600;font-size:15px;letter-spacing:.5px;color:#141414;pointer-events:none;animation:cashrise 1.4s cubic-bezier(.2,.6,.3,1) forwards;white-space:nowrap;}
@keyframes cashrise{0%{opacity:0;transform:translateY(8px);}15%{opacity:1;transform:translateY(0);}100%{opacity:0;transform:translateY(-30px);}}
.lc-cash>em{font-style:normal;font-size:10px;color:#9a9a9a;letter-spacing:.5px;margin-top:2px;}
.lc-level{display:flex;flex-direction:column;align-items:flex-end;text-align:right;}
.lc-level>i{font-style:normal;font-size:9px;letter-spacing:2px;color:#787878;text-transform:uppercase;}
.lc-level>b{font-weight:600;font-size:14.5px;letter-spacing:1.5px;text-transform:uppercase;line-height:1.1;margin-top:1px;}
.lc-pips{display:flex;gap:4px;margin-top:7px;}
.lc-pip{width:8px;height:8px;transform:rotate(45deg);border:1px solid #d2d2d2;}
.lc-pip.on{background:#141414;border-color:#141414;}
.lc-head{text-align:center;margin-top:40px;}
/* Petit panneau d'explication affiche au-dessus de la machine quand une capacite (HOLD/NUDGE/REPULL) est armee */
/* Panneau d'explication en overlay : ne decale pas la mise en page, flotte au-dessus de la machine */
.lc-ability-expl{position:fixed;left:50%;top:14%;transform:translateX(-50%);max-width:320px;width:calc(100% - 40px);background:#141414;color:#fafafa;padding:10px 16px;font-size:11px;letter-spacing:.5px;line-height:1.45;text-align:center;animation:expop .22s ease-out;z-index:30;box-shadow:0 4px 16px rgba(20,20,20,.18);pointer-events:none;}
@keyframes expop{from{opacity:0;transform:translate(-50%,-6px);}to{opacity:1;transform:translate(-50%,0);}}
.lc-over-reason{font-size:11px;letter-spacing:2px;color:#9a9a9a;text-transform:uppercase;margin-top:-4px;margin-bottom:6px;}
.lc-mark{font-size:18px;font-weight:500;letter-spacing:9px;padding-left:9px;}
.lc-sub{font-size:10px;letter-spacing:3px;color:#707070;margin-top:5px;}
.lc-top{display:flex;gap:26px;align-items:flex-end;justify-content:center;flex-wrap:wrap;}
.lc-stat{display:flex;flex-direction:column;align-items:center;gap:2px;}
.lc-stat i{font-style:normal;font-size:9px;letter-spacing:2px;color:#787878;text-transform:uppercase;}
.lc-stat b{font-weight:400;font-size:16px;letter-spacing:1px;}
.lc-stat.big b{font-size:24px;font-weight:500;}
.lc-stage{width:100%;max-width:300px;position:relative;}
/* Table/socle sur lequel repose la machine, change avec la classe sociale */
.lc-table{position:absolute;left:50%;bottom:-40%;transform:translateX(-50%);width:162%;height:auto;pointer-events:none;z-index:0;user-select:none;}
/* Degrade : court, au-dessus de la table. La partie blanche ne va pas plus bas que les boutons Acheter/Ma vie. */
.lc-table-fade{position:absolute;left:-70%;right:-70%;width:240%;bottom:-78%;height:75%;background:linear-gradient(to bottom,rgba(250,250,250,0) 0%,#fafafa 18%,#fafafa 100%);pointer-events:none;}
/* A la rue (carton garage) : un poil plus grande */
.lc-table.t0{bottom:-8%;width:148%;}
/* Survie : palette neuve centree */
.lc-table.t1{bottom:-26%;}
/* Precaire : remonte un poil */
.lc-table.t2{bottom:-35%;width:148%;}
/* Classe moyenne : descend + plus grande */
.lc-table.t3{bottom:-54%;width:174%;}
/* Aise : encore plus grande */
.lc-table.t4{bottom:-76%;width:210%;}
/* Riche : table marbre simple */
.lc-table.t5{bottom:-38%;width:220%;}
/* Grande fortune : utilise l'ancienne image riche, garde son ancienne position */
.lc-table.t6{bottom:-49%;width:230%;}
/* Empire : plus grande + descend */
.lc-table.t7{bottom:-44%;width:210%;}
/* Bascule seche gauche-droite quand le levier est tire */
.lc-machine.shake{animation:rocker .26s cubic-bezier(.3,.7,.4,1);transform-origin:50% 100%;}
@keyframes rocker{0%{transform:rotate(0);}22%{transform:rotate(-.55deg);}50%{transform:rotate(.45deg);}78%{transform:rotate(-.15deg);}100%{transform:rotate(0);}}
.lc-machine{position:relative;width:100%;user-select:none;}
.lc-burst{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:5;}
.lc-cn{position:absolute;left:50%;top:74%;font-weight:700;color:#141414;text-shadow:0 0 3px #fff,0 0 2px #fff;transform:translate(-50%,0) scale(.4);opacity:0;animation:burst 1.2s ease-out forwards;will-change:transform,opacity;}
@keyframes burst{0%{opacity:0;transform:translate(-50%,0) scale(.4) rotate(0);}15%{opacity:1;}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),var(--dy)) scale(1) rotate(var(--rot));}}
.lc-levelup{position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;pointer-events:none;text-align:center;background:radial-gradient(circle at 50% 45%,rgba(250,250,250,.92),rgba(250,250,250,.55) 45%,rgba(250,250,250,0) 72%);animation:luwrap 2.1s ease forwards;}
.lc-lu-l{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:#707070;}
.lc-lu-n{font-size:42px;font-weight:600;line-height:1.02;letter-spacing:2px;text-transform:uppercase;max-width:88vw;padding:0 16px;}
.lc-lu-c{font-size:15px;letter-spacing:4px;text-transform:uppercase;margin-top:6px;}
.lc-lu-p{font-size:11px;letter-spacing:1px;color:#777;margin-top:10px;}
@keyframes luwrap{0%{opacity:0;transform:scale(.8);}12%{opacity:1;transform:scale(1.04);}24%{transform:scale(1);}74%{opacity:1;}100%{opacity:0;transform:scale(1.02);}}
.lc-cardnotif{position:fixed;left:50%;top:28%;transform:translateX(-50%);z-index:38;display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #141414;padding:12px 20px 12px 18px;pointer-events:none;animation:cardpop 2.4s cubic-bezier(.2,.9,.2,1) forwards;box-shadow:0 4px 20px rgba(20,20,20,.15);}
.lc-cn-body{display:flex;flex-direction:column;align-items:flex-start;gap:2px;}
.lc-cn-l{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#707070;}
.lc-cn-n{font-size:22px;font-weight:600;letter-spacing:1px;line-height:1;}
@keyframes cardpop{0%{opacity:0;transform:translate(-50%,18px) scale(.9);}10%{opacity:1;transform:translate(-50%,0) scale(1.06);}22%{transform:translate(-50%,0) scale(1);}82%{opacity:1;transform:translate(-50%,0) scale(1);}100%{opacity:0;transform:translate(-50%,-8px) scale(1);}}
.lc-img{width:100%;height:100%;display:block;pointer-events:none;}
.lc-sp{position:absolute;pointer-events:none;transition:opacity .12s ease;}
.lc-dome{position:absolute;left:35%;top:0;width:30%;height:18%;border-radius:50%;opacity:0;pointer-events:none;z-index:4;
  background:radial-gradient(circle,rgba(120,120,120,.35),rgba(120,120,120,0) 68%);}
.lc-dome.on{animation:domeglow 1.1s ease-in-out infinite;}
@keyframes domeglow{0%,100%{opacity:0;}50%{opacity:1;}}
.lc-gyrocoin{position:absolute;left:50.1%;top:6.9%;transform:translate(-50%,-50%);z-index:4;pointer-events:none;}
/* Porte-bonheur achetes : illustrations gravees PNG, aspect-ratio conserve via width seul */
.lc-charm{position:absolute;pointer-events:none;z-index:4;display:block;}
.lc-charm.horseshoe{top:12%;left:61%;width:21%;height:auto;}
.lc-charm.rabbit{top:36%;left:0%;width:14%;height:auto;}
.lc-charm.clover{top:66%;left:55%;width:14%;height:auto;transform:rotate(-6deg);}
/* Au repos : globe en verre vide (opacity 0). Sur gain : fondu in, pulse, fondu out. */
.lc-gc{position:absolute;left:0;top:0;width:100%;height:88%;border-radius:50% 50% 6% 6%;filter:blur(1px);transform:scale(.85);transform-origin:50% 100%;opacity:0;
  background:radial-gradient(60% 50% at 50% 70%,rgba(20,20,20,.85),rgba(20,20,20,.5) 60%,rgba(20,20,20,0) 100%);}
.lc-gyrocoin.on .lc-gc{animation:gyrofade 5s ease-out, domepulse .55s ease-in-out infinite;}
@keyframes gyrofade{0%{opacity:0;}10%{opacity:1;}86%{opacity:1;}100%{opacity:0;}}
@keyframes domepulse{0%,100%{transform:scale(.85);}50%{transform:scale(1.08);}}
.lc-rays{position:absolute;inset:0;width:100%;height:100%;opacity:0;pointer-events:none;z-index:4;}
.lc-rays.on{animation:raysflash .5s ease-in-out infinite;}
.lc-raygrp{transform-origin:361px 50px;transform-box:view-box;}
.lc-rays.on .lc-raygrp{animation:raysstretch .5s ease-in-out infinite;}
@keyframes raysflash{0%,100%{opacity:.18;}50%{opacity:1;}}
@keyframes raysstretch{0%,100%{transform:scale(1);}50%{transform:scale(1.22);}}
.lc-payout{position:absolute;left:50%;top:85%;transform:translateX(-50%);z-index:5;pointer-events:none;display:flex;align-items:center;justify-content:center;}
.lc-pamt{position:relative;font-weight:600;letter-spacing:.5px;color:#fff;white-space:nowrap;text-shadow:0 1px 3px rgba(0,0,0,.9),0 0 2px rgba(0,0,0,.75);animation:pamt 2.4s ease-out forwards;}
@keyframes pamt{0%{opacity:0;transform:translateY(8px) scale(.8);}8%{opacity:1;transform:translateY(0) scale(1.14);}16%{transform:translateY(0) scale(1);}68%{opacity:1;transform:translateY(-3px) scale(1);}100%{opacity:0;transform:translateY(-42px) scale(1);}}
.lc-ring{position:absolute;width:2.4em;height:2.4em;border:1px solid rgba(255,255,255,.7);border-radius:50%;animation:pring 1s ease-out forwards;}
@keyframes pring{0%{opacity:.5;transform:scale(.3);}100%{opacity:0;transform:scale(1.3);}}
.lc-reel{position:absolute;overflow:hidden;background:#fff;transition:outline-color .15s;}
/* Secousse "thunk" a l'arret : appliquee uniquement sur les symboles internes, le cadre blanc ne bouge pas */
/* Thump retire : pas de coup additionnel a l'arret du rouleau */
.lc-cellwrap.landed{}
.lc-reel.holdable{cursor:pointer;}
/* HOLD arme, non bloque : tag minimal "HOLD" en haut du rouleau, gravure inversee blanche sur noir */
.lc-reel.holdable:not(.held)::after{content:"HOLD";position:absolute;left:50%;top:4px;transform:translateX(-50%);font-size:7px;letter-spacing:3px;font-weight:400;color:#fafafa;background:#141414;padding:2px 7px 1px;pointer-events:none;z-index:4;animation:tagfade .2s ease;}
/* Rouleau bloque : outline 2px + cadenas filaire blanc sur pastille noire, plus visible */
.lc-reel.held{outline:2px solid #141414;outline-offset:-2px;}
.lc-lock{position:absolute;left:50%;top:4px;transform:translateX(-50%);width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:#141414;border:1px solid #141414;pointer-events:none;z-index:5;color:#fafafa;animation:tagfade .2s ease;}
.lc-lock svg{width:22px;height:22px;display:block;}
@keyframes tagfade{from{opacity:0;transform:translate(-50%,-2px);}to{opacity:1;transform:translateX(-50%);}}
/* NUDGE arme : outline pointille 1px discret sur les rouleaux */
.lc-reel.nudgable{outline:1px dashed #141414;outline-offset:-1px;}
/* Boutons NUDGE : chevrons SVG blancs sur fond noir au-dessus/en-dessous du rouleau */
.lc-nudgebtn{position:absolute;height:5.4%;min-height:22px;background:#141414;border:1px solid #141414;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:6;padding:0;color:#fafafa;font-family:inherit;transition:background .12s,color .12s;}
.lc-nudgebtn svg{width:78%;height:78%;display:block;}
.lc-nudgebtn:hover{background:#fafafa;color:#141414;}
.lc-nudgebtn:active{transform:scale(.94);}
/* Bouton REPULL : flche courte blanche sur disque noir au centre du rouleau */
.lc-repullbtn{position:absolute;transform:translate(-50%,-50%);width:34px;height:34px;background:#141414;border:1px solid #141414;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:9;padding:0;color:#fafafa;font-family:inherit;transition:.12s;}
.lc-repullbtn svg{width:20px;height:20px;display:block;}
.lc-repullbtn:hover{background:#fafafa;color:#141414;}
.lc-repullbtn:active{transform:translate(-50%,-50%) scale(.9);}
.lc-shadow{position:absolute;pointer-events:none;z-index:2;
  background:linear-gradient(to bottom,rgba(70,70,70,.55) 0%,rgba(70,70,70,.24) 50%,rgba(255,255,255,0) 100%);}
.lc-strip{position:absolute;left:0;top:0;width:100%;}
.lc-cell{display:flex;align-items:center;justify-content:center;width:100%;}
.lc-winline{position:absolute;transform:translateY(-50%);height:0;border-top:1px solid #141414;
  pointer-events:none;animation:wl .6s ease infinite alternate;}
@keyframes wl{from{opacity:.2;}to{opacity:.9;}}
.lc-lever{position:absolute;right:1%;top:24%;width:22%;height:40%;background:transparent;border:none;cursor:pointer;border-radius:40%;z-index:3;}
.lc-lever:disabled{cursor:default;}
.lc-pullhint{position:absolute;left:84%;top:-3%;width:22%;height:16%;z-index:5;pointer-events:none;animation:pullbob 1.15s ease-in-out infinite;}
.lc-pullhint svg{width:100%;height:100%;display:block;overflow:visible;}
@keyframes pullbob{0%,100%{transform:translateY(-6%);opacity:.55;}50%{transform:translateY(15%);opacity:.95;}}
/* Boutons d'armement des capacites HOLD / NUDGE / REPULL sous la machine.
   Click pour activer -> les contreoles (tap rouleau / fleches / cercle) apparaissent dans la machine. */
.lc-abilities{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:-14px;position:relative;z-index:2;}
.lc-readout + .lc-ctrl{margin-top:-14px;}
.lc-abil{display:flex;align-items:center;gap:6px;padding:7px 12px 7px 10px;background:#fff;border:1px solid #141414;cursor:pointer;font-family:inherit;font-size:11px;letter-spacing:1px;color:#141414;transition:background .12s,color .12s;}
.lc-abil b{font-weight:600;letter-spacing:1.5px;}
.lc-abil:hover:not(:disabled){background:#fafafa;}
.lc-abil.on,.lc-abil.on:hover:not(:disabled){background:#141414;color:#fff;}
.lc-abil.on img{filter:invert(1);}
.lc-abil:disabled{opacity:.4;cursor:not-allowed;}
.lc-crow{display:flex;gap:12px;justify-content:center;}
.lc-btn.ghost{background:#fff;color:#141414;}
.lc-btn.ghost:hover{background:#141414;color:#fff;}
.lc-readout{height:38px;display:flex;align-items:center;justify-content:center;text-align:center;padding:3px 16px;position:relative;z-index:2;}
.lc-win{font-size:25px;font-weight:300;letter-spacing:1px;}
.lc-win.big{font-weight:500;}
.lc-lose{font-size:22px;color:#b4b4b4;}
.lc-neg{font-size:12px;letter-spacing:3px;color:#9a9a9a;text-transform:uppercase;}
.lc-idle{font-size:10px;letter-spacing:2px;color:#7f7f7f;}
.lc-flash{font-size:11px;letter-spacing:.5px;color:#666;font-style:italic;line-height:1.35;max-width:380px;}
.lc-ctrl{display:flex;align-items:center;gap:20px;margin-top:2px;flex-wrap:wrap;justify-content:center;position:relative;z-index:2;}
.lc-betwrap{display:flex;flex-direction:column;align-items:center;gap:8px;}
.lc-betbar{display:flex;align-items:center;gap:18px;}
.lc-betcoin{position:relative;width:66px;height:66px;flex:0 0 66px;contain:layout style paint;}
.lc-coinart{position:absolute;inset:0;width:100%;height:100%;display:block;will-change:auto;transform:translateZ(0);}
.lc-betnum{position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;letter-spacing:.3px;line-height:1;font-variant-numeric:tabular-nums;}
.lc-bb{width:28px;height:28px;border:1px solid #141414;background:none;cursor:pointer;font-family:inherit;font-size:17px;font-weight:700;color:#141414;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;}
.lc-bb:disabled{border-color:#dcdcdc;color:#dcdcdc;cursor:default;}
.lc-betval{display:flex;flex-direction:column;align-items:center;min-width:62px;}
.lc-betval i{font-style:normal;font-size:9px;letter-spacing:2px;color:#787878;text-transform:uppercase;}
.lc-betval b{font-weight:500;font-size:16px;letter-spacing:1px;}
.lc-bmax{background:none;border:none;cursor:pointer;font-family:inherit;font-size:10px;letter-spacing:2px;color:#bcbcbc;text-transform:uppercase;padding:4px;}
.lc-bmax:disabled{color:#e0e0e0;cursor:default;}
.lc-pull{background:#141414;color:#fff;border:1px solid #141414;cursor:pointer;font-family:inherit;
  font-size:13px;letter-spacing:6px;padding:11px 30px 11px 36px;transition:.15s;}
.lc-pull:hover:not(:disabled){background:#fff;color:#141414;}
.lc-pull:disabled{border-color:#dcdcdc;color:#dcdcdc;background:#fff;cursor:default;}
.lc-shopbtns{display:flex;gap:14px;position:relative;z-index:2;}
.lc-sb{background:none;border:1px solid #141414;color:#141414;cursor:pointer;font-family:inherit;
  font-size:13px;font-weight:500;letter-spacing:3px;padding:11px 26px;transition:.15s;text-transform:uppercase;}
.lc-sb:hover:not(:disabled){border-color:#141414;color:#141414;}
.lc-sb:disabled{color:#dcdcdc;border-color:#ededed;cursor:default;}
.lc-pay{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;align-items:center;
  font-size:11px;color:#868686;letter-spacing:1px;margin-top:2px;position:relative;z-index:2;}
.lc-pr{display:flex;align-items:center;gap:5px;}
.lc-pr.danger{color:#b4b4b4;}
.lc-fam{margin-bottom:13px;}
.lc-famh{display:flex;justify-content:space-between;align-items:baseline;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#141414;border-bottom:1px solid #ededed;padding:6px 2px 5px;}
.lc-famh span{font-size:10px;letter-spacing:.3px;text-transform:none;color:#6a6a6a;}
.lc-up{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fff;border:none;border-bottom:1px solid #f4f4f4;cursor:pointer;font-family:inherit;padding:9px 2px;color:#141414;text-align:left;transition:.12s;}
.lc-up:hover:not(:disabled){background:#fafafa;}
.lc-up.off{opacity:.4;cursor:default;}
.lc-upn{display:flex;flex-direction:column;gap:2px;font-size:13px;}
.lc-upn i{font-style:normal;font-size:10px;color:#707070;}
.lc-upp{font-size:13px;letter-spacing:1px;white-space:nowrap;}
.lc-max{font-size:10px;letter-spacing:2px;color:#888888;text-transform:uppercase;padding:9px 2px;}
.lc-ovl{position:fixed;inset:0;z-index:30;background:rgba(250,250,250,.9);backdrop-filter:blur(2px);
  display:flex;align-items:center;justify-content:center;padding:24px;animation:fd .25s ease;}
@keyframes fd{from{opacity:0;}to{opacity:1;}}
.lc-modal{width:100%;max-width:360px;background:#fff;border:1px solid #141414;padding:30px 26px;
  text-align:center;animation:rs .3s cubic-bezier(.2,.9,.2,1);}
.lc-modal.wide{max-width:460px;}
@keyframes rs{from{transform:translateY(14px);opacity:0;}to{transform:none;opacity:1;}}
.lc-mt{font-size:16px;font-weight:500;letter-spacing:9px;padding-left:9px;}
.lc-mh{font-size:16px;font-weight:500;letter-spacing:6px;}
.lc-ms{font-size:11px;letter-spacing:2px;color:#707070;margin:7px 0 18px;}
.lc-mb{font-size:12px;letter-spacing:1px;color:#555;margin:8px 0 4px;}
/* INTRO monumental */
.lc-modal.intro{max-width:480px;padding:46px 32px 32px;}
.lc-mt-big{font-size:46px;font-weight:600;letter-spacing:10px;line-height:.95;padding-left:10px;}
.lc-ms-big{font-size:11px;letter-spacing:6px;color:#7a7a7a;text-transform:uppercase;margin:18px 0 36px;}
.lc-intro-body{text-align:left;display:flex;flex-direction:column;gap:14px;font-size:15.5px;line-height:1.6;color:#2a2a2a;margin-bottom:24px;}
.lc-onecoin{display:flex;flex-direction:column;align-items:center;gap:6px;padding:18px 0 22px;border-top:1px solid #141414;border-bottom:1px solid #141414;margin:6px 0 22px;}
.lc-onecoin span{font-size:10px;letter-spacing:4px;color:#7a7a7a;text-transform:uppercase;}
.lc-onecoin b{font-size:30px;font-weight:600;letter-spacing:6px;color:#141414;line-height:1;}
.lc-intro-tag{color:#141414;font-style:italic;letter-spacing:1px;text-align:center;margin:0 0 30px;font-size:12px;}
.lc-btn.big{font-size:14px;letter-spacing:7px;padding:14px 38px 14px 45px;}
.lc-confirm{font-size:14px;line-height:1.55;color:#141414;letter-spacing:.5px;text-align:center;margin:8px 0 26px;}
.lc-finaltag{color:#141414;font-style:italic;letter-spacing:.4px;text-align:center;font-size:13px;line-height:1.55;margin:18px 0 28px;}
.lc-statbox{display:flex;flex-direction:column;gap:6px;text-align:left;border:1px solid #ededed;padding:12px 14px;margin:14px 0 16px;background:#fafafa;}
.lc-stat-row{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:11px;letter-spacing:.5px;color:#444;}
.lc-stat-row span{color:#7a7a7a;text-transform:uppercase;letter-spacing:1.5px;font-size:9px;}
.lc-stat-row b{font-weight:600;font-size:13px;letter-spacing:.5px;color:#141414;}
.lc-stat-row i{font-style:normal;font-size:10px;color:#9a9a9a;letter-spacing:1px;margin-left:4px;}
.lc-rules{text-align:left;display:flex;flex-direction:column;gap:11px;font-size:13px;line-height:1.55;color:#444;margin-bottom:22px;}
.lc-rules b{color:#141414;font-weight:500;}
.lc-tag{color:#141414;font-style:italic;letter-spacing:.5px;text-align:center;margin-top:4px;}
.lc-btn{background:#141414;color:#fff;border:1px solid #141414;cursor:pointer;font-family:inherit;
  font-size:13px;letter-spacing:5px;padding:11px 30px 11px 35px;transition:.15s;}
.lc-btn:hover{background:#fff;color:#141414;}
.lc-disc{font-size:9px;letter-spacing:2px;color:#8a8a8a;margin-top:16px;}
.lc-el{font-size:10px;letter-spacing:4px;color:#707070;text-transform:uppercase;}
.lc-en{font-size:26px;font-weight:300;letter-spacing:2px;margin:6px 0 2px;}
.lc-list{margin:14px 0 20px;max-height:48vh;overflow-y:auto;text-align:left;padding-right:10px;}
.lc-actgrp{margin-bottom:14px;}
.lc-acth{font-size:9px;letter-spacing:3px;color:#7f7f7f;text-transform:uppercase;padding:6px 2px;border-bottom:1px solid #f0f0f0;margin-bottom:4px;}
.lc-row{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;
  background:#fff;border:none;border-bottom:1px solid #f4f4f4;cursor:pointer;font-family:inherit;
  padding:9px 2px;color:#141414;text-align:left;transition:.12s;}
.lc-row:hover:not(:disabled){background:#fafafa;}
.lc-row.owned{color:#c4c4c4;cursor:default;}
.lc-row.off{opacity:.45;cursor:default;}
.lc-row.own{cursor:default;}
.lc-rn{display:flex;flex-direction:column;gap:2px;font-size:13px;}
.lc-rn i{font-style:normal;font-size:10px;color:#707070;letter-spacing:.3px;}
.lc-rp{font-size:13px;letter-spacing:1px;white-space:nowrap;}
.lc-sell{background:none;border:1px solid #d9d9d9;color:#555;cursor:pointer;font-family:inherit;
  font-size:11px;letter-spacing:1px;padding:6px 12px;white-space:nowrap;transition:.15s;}
.lc-sell:hover{border-color:#141414;color:#141414;}
.lc-empty{font-size:12px;color:#787878;letter-spacing:1px;text-align:center;padding:20px 0;}
.lc-rule{display:flex;align-items:center;gap:12px;padding:7px 2px;border-bottom:1px solid #f4f4f4;}
.lc-rule-txt{display:flex;flex-direction:column;gap:2px;}
.lc-rule-txt b{font-size:13px;font-weight:500;letter-spacing:.3px;}
.lc-rule-txt i{font-style:normal;font-size:10.5px;color:#707070;line-height:1.3;}
.lc-combo{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 2px;border-bottom:1px solid #f7f7f7;font-size:12px;}
.lc-combo b{font-weight:500;}
.lc-combo i{font-style:normal;color:#707070;text-align:right;}
`;
