import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { IMG, UP_SPR, PRESS_SPR, COVER_SPR } from "./assets";

/* ============================================================
   LAST COIN — machine à sous narrative. Une pièce → un empire.
   Argent fictif, aucun paiement réel.
   Phase 1 : symboles, table de gains, Cash/Net Worth, achats +
   revente, revenu passif, sauvegarde. (Hope/Risk & crises = Phase 2)
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
  crown: '<path d="M14 78 L22 36 L38 56 L50 30 L62 56 L78 36 L86 78 Z" fill="__C__"/><rect x="14" y="80" width="72" height="10" fill="__C__"/>',
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
// Jauge en forme d'icône qui se remplit par le bas : cœur (moral) ou triangle de danger (risque)
function Gauge({ kind, pct, hot }) {
  const p = Math.max(0, Math.min(100, pct));
  const y = 24 * (1 - p / 100);
  const id = kind + "fill";
  const d = kind === "hope"
    ? "M12 20.5 C6 15.5 3 12 3 8.5 C3 6 5 4 7.5 4 C9.4 4 11.1 5.2 12 7 C12.9 5.2 14.6 4 16.5 4 C19 4 21 6 21 8.5 C21 12 18 15.5 12 20.5 Z"
    : "M12 3 L22 20.5 L2 20.5 Z";
  return (
    <div className={"lc-gauge" + (hot ? " hot" : "")} title={kind === "hope" ? "moral" : "danger"}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <defs><clipPath id={id}><rect x="0" y={y} width="24" height={24 - y} /></clipPath></defs>
        <path d={d} fill="#e6e6e6" />
        <path d={d} fill="#141414" clipPath={"url(#" + id + ")"} />
        <path d={d} fill="none" stroke="#141414" strokeWidth="1.4" strokeLinejoin="round" />
        {kind === "hope" && p <= 10 && <path d="M12 5 L10 9 L13.2 12 L9.6 15.5 L12 19.5" fill="none" stroke="#141414" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />}
        {kind === "risk" && p >= 90 && <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M12 9 V14.4" /><path d="M12 16.8 V18" /></g>}
      </svg>
      <span>{kind === "hope" ? "moral" : "risque"}</span>
    </div>
  );
}
const SYM_NAME = { coin: "Coin", star: "Star", house: "House", diamond: "Diamond", crown: "Crown", bolt: "Bolt", eye: "Eye", joker: "Joker", skull: "Skull", crack: "Crack" };
const SYM_INFO = [
  ["coin",  "gain de base"],
  ["star",  "chance — gain supérieur"],
  ["house", "patrimoine"],
  ["diamond", "luxe — pierre précieuse"],
  ["crown", "revanche — rare, gros gain"],
  ["bolt",  "machine — paire = 1 carte HOLD · triple = 2 cartes (max 9)"],
  ["eye",   "prédiction — effet à venir (Phase 3)"],
  ["joker", "WILD — remplace n'importe quel symbole · 3 = jackpot"],
  ["skull", "DANGER — 3 alignés = tu perds la mise (crise en Phase 2)"],
  ["crack", "DANGER — 3 alignés = panne (réparation en Phase 2)"],
];

// ===== Table de gains (multiplicateurs de mise) =====
// 3 identiques (le joker complète) :
const PAY3 = { coin: 5, star: 9, house: 13, diamond: 19, crown: 75, bolt: 5, eye: 7, joker: 95 };
// 2 identiques sans joker (petit gain) :
const PAY2 = { coin: 1, star: 2, house: 2.5, diamond: 3, crown: 7, bolt: 1.5, eye: 2 };
const NEG = { skull: true, crack: true };           // symboles "danger"
const PAY_ROW = ["coin", "star", "house", "diamond", "crown"]; // affichés dans la mini-table

function evaluate(t) {
  const jokers = t.filter((s) => s === "joker").length;
  const non = t.filter((s) => s !== "joker");
  if (jokers === 3) return { kind: 3, sym: "joker", mult: PAY3.joker };
  const f = {}; non.forEach((s) => { f[s] = (f[s] || 0) + 1; });
  const ent = Object.entries(f).sort((a, b) => b[1] - a[1]);
  const [topSym, topCnt] = ent[0];
  // 3 identiques (avec complétion joker, mais le joker ne complète PAS un symbole danger)
  if (topCnt + jokers >= 3) {
    if (NEG[topSym]) { if (topCnt === 3) return { kind: -1, sym: topSym, mult: 0 }; }
    else return { kind: 3, sym: topSym, mult: PAY3[topSym] };
  }
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

// ===== Patrimoine par FAMILLES. Un nouveau palier REMPLACE l'ancien (reprise de l'ancien). =====
// Toutes les familles déterminent la CLASSE SOCIALE = le niveau (statut). "business" donne en plus du revenu.
const FAM = [
  { id: "vetements", name: "Vêtements", life: true, start: "T-shirt troué", tiers: [
    { n: "Fringues correctes",              price: 60,       resale: 15, line: "Tu ne sens plus tout à fait la défaite." },
    { n: "Costume bas de gamme",            price: 18000,    resale: 3000 },
    { n: "Montre correcte",                 price: 350000,   resale: 90000 },
    { n: "Lunettes & chaussures de marque", price: 1500000,  resale: 400000 },
    { n: "Tenue sur-mesure",                price: 12000000, resale: 3000000 },
  ] },
  { id: "logement", name: "Logement", life: true, start: "Garage", tiers: [
    { n: "Matelas & frigo",     price: 300,      resale: 80, line: "Ce soir, le sol a perdu." },
    { n: "Studio humide",       price: 7500,     resale: 4500, line: "Tu quittes le garage. Il ne te regrettera pas." },
    { n: "Appartement correct", price: 35000,    resale: 24000 },
    { n: "Maison de banlieue",  price: 250000,   resale: 180000 },
    { n: "Loft industriel",     price: 2000000,  resale: 1350000 },
    { n: "Villa moderne",       price: 8000000,  resale: 5600000, line: "Une villa. Le garage n'est plus qu'un mauvais rêve." },
  ] },
  { id: "vehicule", name: "Véhicule", life: true, start: "À pied", tiers: [
    { n: "Scooter fatigué",    price: 2500,     resale: 900, line: "Deux roues. L'une d'elles croit en toi." },
    { n: "Voiture cabossée",   price: 12000,    resale: 5500 },
    { n: "Voiture compacte",   price: 55000,    resale: 32000 },
    { n: "Berline d'occasion", price: 120000,   resale: 70000 },
    { n: "SUV luxueux",        price: 1200000,  resale: 650000 },
    { n: "Supercar",           price: 12000000, resale: 5500000, line: "Quatre roues. Deux d'entre elles croient en toi." },
  ] },
  { id: "business", name: "Business", life: false, start: "Sans revenu", tiers: [
    { n: "Café minable",        price: 500000,   resale: 260000,  inc: 200, line: "De l'argent qui dort à ta place." },
    { n: "Laverie automatique", price: 850000,   resale: 520000,  inc: 600 },
    { n: "Bar de quartier",     price: 3200000,  resale: 1700000, inc: 2500 },
    { n: "Salle d'arcade",      price: 5000000,  resale: 2400000, inc: 5000 },
    { n: "Petit hôtel",         price: 18000000,  resale: 10000000, inc: 18000 },
    { n: "Casino clandestin",   price: 85000000,  resale: 55000000, inc: 80000, line: "Tu possèdes la maison. La maison gagne toujours." },
  ] },
];
const FAM0 = { vetements: 0, logement: 0, vehicule: 0, business: 0 };
const ownedTier = (f, lvl) => (lvl[f.id] > 0 ? f.tiers[lvl[f.id] - 1] : null);
// classe sociale issue des familles "de vie" (somme des paliers)
const CLASSES = ["à la rue", "survie", "précaire", "classe moyenne", "aisé", "riche", "grande fortune", "empire"];
// chaque classe sociale débloque un LIEU de jeu de plus en plus prestigieux
const VENUES = ["garage", "bar du coin", "tripot de quartier", "salle de jeux", "casino municipal", "casino privé", "cercle de jeu", "palais du hasard"];
const classOf = (lvl) => {
  const s = lvl.vetements + lvl.logement + lvl.vehicule + lvl.business;   // 0..23 : tout le patrimoine compte
  return s >= 22 ? 7 : s >= 18 ? 6 : s >= 14 ? 5 : s >= 10 ? 4 : s >= 6 ? 3 : s >= 3 ? 2 : s >= 1 ? 1 : 0;
};

// ===== Bandes fixes des rouleaux =====
const BAND_W = { coin: 8, star: 5, house: 3, diamond: 3, bolt: 3, eye: 2, joker: 3, skull: 2, crack: 2, crown: 1 };
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

// ===== Narratif (FR + punchlines EN). Rare et ciblé : surtout aux moments forts. =====
const N = {
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
};

// ===== Phase 2 : Hope, Risk, crises =====
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const HOPE0 = 70;
// risque de fond selon le train de vie : plus tu exhibes, plus tu es exposé
const luxBase = (nw) => (nw >= 5e6 ? 14 : nw >= 5e5 ? 9 : nw >= 50000 ? 5 : nw >= 5000 ? 2 : 0);
const CRISIS = {
  loyer:       { t: "LOYER DÛ",        s: "Le proprio veut son dû. Maintenant." },
  cambriolage: { t: "CAMBRIOLAGE",     s: "On a forcé ta porte. Le tiroir crie famine." },
  fisc:        { t: "LE FISC",         s: "Une lettre polie. Des chiffres qui le sont moins." },
  venteforcee: { t: "SAISIE",          s: "L'huissier choisit. Pas toi." },
  spirale:     { t: "TOUT S'EFFONDRE", s: "Trop haut, trop vite. Le sol se dérobe." },
};
const N_CRISIS = {
  loyer: "Encore un mois. Gagné, ou juste reporté.",
  cambriolage: "Tu comptes ce qui reste. Vite fait.",
  fisc: "L'État aussi joue à la machine. Il gagne toujours.",
  venteforcee: "Ils emportent un bout de toi.",
  spirale: "Presque tout. Tu gardes une pièce.",
};
function makeCrisis(id, nw, has) {
  if (id === "roll") id = pick(has ? ["loyer", "cambriolage", "fisc", "venteforcee"] : ["loyer", "cambriolage", "fisc"]);
  const amount = id === "loyer" ? Math.max(20, Math.round(nw * 0.05))
    : id === "fisc" ? Math.max(15, Math.round(nw * 0.03)) : 0;
  return { id, amount };
}

export default function LastCoin() {
  const initRef = useRef(null);
  if (!initRef.current) initRef.current = loadSave() || {};
  const init = initRef.current;

  const [screen, setScreen] = useState(() => (init.cash != null ? "play" : "intro"));
  const [cash, setCash] = useState(() => (init.cash != null ? init.cash : 1));
  const [lvl, setLvl] = useState(() => ({ ...FAM0, ...(init.lvl || {}) }));
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
  const [machineW, setMachineW] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [overlay, setOverlay] = useState(null);   // "buy" | "assets" | null
  const [hope, setHope] = useState(() => (init.hope != null ? init.hope : HOPE0));
  const [risk, setRisk] = useState(() => init.risk || 0);
  const [jammed, setJammed] = useState(() => !!init.jammed);   // panne : à réparer avant de rejouer
  const [crisis, setCrisis] = useState(null);                  // crise active (modale)
  const [wonEmpire, setWonEmpire] = useState(() => !!init.empire);
  const [confirmReset, setConfirmReset] = useState(false);   // pause : confirmation avant de recommencer
  const [durations] = useState([1.6, 2.25, 2.9]);   // roulement plus long
  const [held, setHeld] = useState([false, false, false]);                 // rouleaux marqués HOLD avant le tour
  const [holdCharges, setHoldCharges] = useState(() => init.holdCharges || 0);  // jetons HOLD dispos (gagnés via Bolt)
  const [spinHeld, setSpinHeld] = useState([false, false, false]);         // rouleaux figés pendant l'anim du tour
  const machineRef = useRef(null);
  const lampTimer = useRef(null);                    // gyro : timer de 5 s

  // strips
  const makeStrip = (band, stop, run) => {
    const n = run + 2;
    const cells = [];
    for (let k = -n; k <= 1; k++) cells.push(bandAt(band, stop + k));
    return { cells, t: cells.length - 2 };
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
  const socialClass = CLASSES[classIdx];
  const venue = VENUES[classIdx];         // lieu de jeu débloqué par la classe
  const maxBetIdx = (() => { let m = 0; for (let i = 0; i < BET_STEPS.length; i++) { if (BET_STEPS[i] <= cash) m = i; else break; } return m; })();
  const bet = cash >= 1 ? BET_STEPS[Math.min(betIdx, maxBetIdx)] : 0;
  const repairCost = Math.max(15, Math.round(netWorth * 0.02));
  const hot = risk >= 66;

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
    return phase === "start" ? 0 : restY(strips[r].t);
  };

  useLayoutEffect(() => {
    const el = machineRef.current; if (!el) return;
    const u = () => setMachineW(el.clientWidth);
    u(); const ro = new ResizeObserver(u); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // sauvegarde auto
  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cash, lvl, betIdx, pulls, hope, risk, jammed, empire: wonEmpire, holdCharges })); } catch {}
  }, [cash, lvl, betIdx, pulls, hope, risk, jammed, wonEmpire, holdCharges]);

  // fin de partie : à sec et plus rien à vendre
  useEffect(() => {
    if (screen === "play" && !spinning && cash < 1 && !hasAssets) setScreen("over");
  }, [cash, hasAssets, spinning, screen]);

  const say = (txt) => { setFlash(txt); };

  const newGame = () => {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    setCash(1); setLvl({ ...FAM0 }); setBetIdx(0); setPulls(0);
    setHope(HOPE0); setRisk(0); setJammed(false); setCrisis(null); setWonEmpire(false);
    setLastWin(null); setFlash(""); setLampOn(false); setWinLine(false);
    setStrips(REELS.map((_, r) => restStrip(r))); setPhase("idle"); setSpinning(false);
    setHeld([false, false, false]); setHoldCharges(0); setSpinHeld([false, false, false]);
    setCardNotif(null); setLevelUp(null); setBurst(null); setWinFx(null);
    setOverlay(null); setConfirmReset(false); setScreen("intro");   // repasse par l'intro pour rappeler le contexte
  };

  const resolveAll = useCallback((targets, spend, lk, snap) => {
    const res = evaluate(targets);
    const payout = res.kind > 0 ? Math.round(spend * res.mult * lk) : 0;
    setCash((c) => c + payout + income);   // c = cash déjà amputé de la mise au lancement
    setPulls((p) => p + 1);

    // Bolt = cartes HOLD : seules les paires et triples d'eclair sortent une carte (rare)
    const bolts = targets.filter((t) => t === "bolt").length;
    const cardGain = bolts >= 3 ? 2 : bolts >= 2 ? 1 : 0;
    if (cardGain > 0) {
      setHoldCharges((c) => Math.min(9, c + cardGain));
      setCardNotif({ n: cardGain, k: Date.now() });
      setTimeout(() => setCardNotif(null), 2400);
    }

    // --- Phase 2 : Risk / Hope / panne / crises ---
    const skull = res.kind === -1 && res.sym === "skull";
    const crack = res.kind === -1 && res.sym === "crack";
    const newRisk = clamp(snap.risk * 0.9 + snap.frac * 34 + luxBase(snap.nw) + (skull ? 22 : 0), 0, 100);
    setRisk(newRisk);
    let dHope = payout > 0 ? 5 : -2;
    if (skull) dHope -= 9;
    if (snap.frac > 0.45 && payout === 0) dHope -= 5;      // grosse mise perdue = coup au moral
    const newHope = clamp(snap.hope + dHope, 0, 100);
    setHope(newHope);
    if (crack) setJammed(true);                            // panne : réparer avant de rejouer
    // les événements ne tombent QUE quand le risque devient élevé (zone chaude)
    const RISK_TRIG = 66;
    let trig = null;
    if (newHope <= 0) trig = "spirale";
    else if (newRisk >= RISK_TRIG) {
      const over = (newRisk - RISK_TRIG) / (100 - RISK_TRIG);   // 0..1 dans la zone chaude
      if (!crack && skull && Math.random() < 0.5) trig = "cambriolage";
      else if (!crack && Math.random() < over * 0.18) trig = "roll";
    }
    if (trig) setCrisis(makeCrisis(trig, snap.nw, snap.has));

    const first = pulls === 0;
    const big = res.kind === 3 && res.mult >= 20;
    setLastWin(payout > 0 ? { amount: payout, big } : res.kind === -1 ? { neg: res.sym } : { amount: 0 });
    if (payout > 0) {
      setLampOn(true); setWinLine(true); setWinFx({ a: payout, k: Date.now() });
      if (lampTimer.current) clearTimeout(lampTimer.current);
      lampTimer.current = setTimeout(() => setLampOn(false), 5000);          // gyro : 5 s ou jusqu'au prochain tour
      setTimeout(() => setWinLine(false), 1400);
      setTimeout(() => setWinFx(null), 2400);          // montant blanc : animation plus longue
      if (res.kind === 3) {            // 3 alignés : pluie de $ (plus dense si gros gain)
        const count = big ? 24 : 14;
        setBurst(Array.from({ length: count }, (_, i) => ({
          dx: (Math.random() * 2 - 1) * 6.5, dy: -(2.5 + Math.random() * 7),
          rot: (Math.random() * 2 - 1) * 70, delay: Math.random() * 0.32,
          s: 0.85 + Math.random() * 0.85, k: Date.now() + i,
        })));
        setTimeout(() => setBurst(null), 1400);
      }
    }

    // narratif : rare et ciblé (toujours sur 1er gain / jackpot / gros gain / danger ; sinon faible chance)
    if (first) say(N.first[0]);
    else if (res.kind === 3 && res.sym === "joker") say(pick(N.jackpot));
    else if (big) say(pick(N.big));
    else if (res.kind === -1) say(res.sym === "skull" ? pick(N.skull) : pick(N.crack));
    else if (payout > 0) say(Math.random() < 0.10 ? pick(N.win) : "");
    else say(Math.random() < 0.05 ? pick(N.lose) : "");
  }, [income, pulls]);

  const spin = () => {
    if (spinning || screen !== "play" || jammed || crisis) return;
    if (bet < 1) return;                       // à sec : le bouton invite à vendre
    const lk = luck();                          // multiplicateur constant : la machine ne triche plus selon le porte-monnaie
    const snap = { frac: bet / Math.max(1, cash), nw: netWorth, risk, hope, has: hasAssets };
    if (lampTimer.current) clearTimeout(lampTimer.current);
    setFlash(""); setLastWin(null); setLampOn(false); setWinLine(false); setWinFx(null); setBurst(null);
    setPressed(true); setTimeout(() => setPressed(false), 600);
    setCash((c) => c - bet);
    setSpinning(true);

    // HOLD : on plafonne par le nombre de charges dispos. Si l'utilisateur a marqué plus que disponible (impossible via UI mais sécurité), on ignore les surplus dans l'ordre.
    const holdSnap = held.slice();
    let avail = holdCharges;
    for (let r = 0; r < 3; r++) { if (holdSnap[r] && avail > 0) avail--; else holdSnap[r] = false; }
    const consumed = holdSnap.filter(Boolean).length;
    setSpinHeld(holdSnap);
    if (consumed > 0) setHoldCharges((c) => c - consumed);
    setHeld([false, false, false]);

    const run = 28;
    const first = pulls === 0;
    const targets = [];
    const newStrips = REELS.map((_, r) => {
      if (holdSnap[r]) {                              // rouleau bloqué : on garde tel quel
        targets.push(strips[r].cells[strips[r].t]);
        return strips[r];
      }
      const band = BANDS[r];
      let want = first ? "coin" : pick(POOL);          // 1er tirage garanti : la machine "recrache"
      let positions = [];
      for (let i = 0; i < band.length; i++) if (band[i] === want) positions.push(i);
      if (positions.length === 0) { const idx = (Math.random() * band.length) | 0; positions = [idx]; want = band[idx]; }
      const stop = positions[(Math.random() * positions.length) | 0];
      targets.push(bandAt(band, stop));
      return makeStrip(band, stop, run);
    });

    setStrips(newStrips);
    setPhase("start");
    requestAnimationFrame(() => requestAnimationFrame(() => setPhase("run")));
    setTimeout(() => {
      resolveAll(targets, bet, lk, snap);
      setPhase("idle"); setSpinning(false); setSpinHeld([false, false, false]);
    }, 3150);
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
    setHope((h) => clamp(h + (f.id === "logement" ? 14 : 6), 0, 100));   // s'installer relève le moral
    // narratif ciblé : montée de classe > achat emblématique > parfois
    if (classUp) {
      say(N.classUp[newClass]);
      setLevelUp({ n: newClass + 1, cls: CLASSES[newClass], k: Date.now() });
      setTimeout(() => setLevelUp(null), 2100);
      if (newClass === 7 && !wonEmpire) { setWonEmpire(true); setTimeout(() => { setOverlay(null); setScreen("empire"); }, 2200); }
    } else if (tier.line) say(tier.line);
    else if (Math.random() < 0.28) say(pick(N.buy));
    else say("");
  };
  const sellFam = (f) => {                        // revente d'urgence : liquide la famille
    const L = lvl[f.id];
    if (L <= 0) return;
    setCash((c) => c + f.tiers[L - 1].resale); setLvl((v) => ({ ...v, [f.id]: 0 }));
    setHope((h) => clamp(h - 10, 0, 100)); say(pick(N.sell));
  };

  const repair = () => { if (!jammed || cash < repairCost) return; setCash((c) => c - repairCost); setJammed(false); say("La machine repart. Pour l'instant."); };
  const forceSell = () => {
    let best = null, bp = 0;
    FAM.forEach((f) => { const t = ownedTier(f, lvl); if (t && t.price > bp) { bp = t.price; best = f; } });
    if (best) { const L = lvl[best.id]; setCash((c) => c + best.tiers[L - 1].resale); setLvl((v) => ({ ...v, [best.id]: L - 1 })); }
  };
  const dropTop = () => {
    let best = null, bl = 0;
    FAM.forEach((f) => { if (lvl[f.id] > bl) { bl = lvl[f.id]; best = f; } });
    if (best) setLvl((v) => ({ ...v, [best.id]: lvl[best.id] - 1 }));
  };
  const payCrisis = () => {
    const c = crisis; if (!c) return;
    if (c.id === "loyer") { if (cash < c.amount) return; setCash((x) => x - c.amount); }
    else if (c.id === "fisc") setCash((x) => Math.max(0, x - c.amount));
    else if (c.id === "cambriolage") { setCash((x) => Math.round(x * 0.78)); setHope((h) => clamp(h - 6, 0, 100)); }
    else if (c.id === "venteforcee") { forceSell(); setHope((h) => clamp(h - 10, 0, 100)); }
    else if (c.id === "spirale") { setCash((x) => Math.round(x * 0.7)); dropTop(); setHope(28); setRisk(0); }
    say(N_CRISIS[c.id] || ""); setCrisis(null);
  };
  const refuseCrisis = () => { setHope((h) => clamp(h - 18, 0, 100)); setRisk((r) => clamp(r + 10, 0, 100)); setCrisis(null); };

  const toggleHold = (r) => {
    if (spinning || screen !== "play" || jammed || crisis) return;
    setHeld((h) => {
      const next = h.slice();
      if (next[r]) { next[r] = false; return next; }                 // déverrouillage : toujours autorisé
      if (next.filter(Boolean).length < holdCharges) next[r] = true; // sinon plafond = jetons dispos
      return next;
    });
  };

  const betDown = () => setBetIdx((i) => Math.max(0, i - 1));
  const betUp = () => setBetIdx((i) => Math.min(maxBetIdx, i + 1));
  const betMax = () => setBetIdx(maxBetIdx);

  return (
    <div className="lc">
      <style>{CSS}</style>

      <div className="lc-bar">
        <div className="lc-cash">
          <i>argent</i>
          <b>{fmt(cash)}</b>
          {income > 0 && <em>+{fmt(income)}/tour</em>}
        </div>
        <button className="lc-menu" onClick={() => { setConfirmReset(false); setScreen("pause"); }} aria-label="pause" title="pause"><i /><i /></button>
        <div className="lc-level">
          <i>niveau {level}</i>
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

      <div className={"lc-stage" + (pressed ? " shake" : "")}>
      <div className="lc-machine" ref={machineRef} style={{ aspectRatio: "870 / 950" }}>
        <img src={IMG} alt="machine" className="lc-img" draggable={false} />
        <img src={UP_SPR} alt="" className="lc-sp" draggable={false} style={{ left: LEV_UP.left + "%", top: LEV_UP.top + "%", width: LEV_UP.w + "%", height: LEV_UP.h + "%", opacity: pressed ? 0 : 1 }} />
        <img src={COVER_SPR} alt="" className="lc-sp" draggable={false} style={{ left: LEV_COVER.left + "%", top: LEV_COVER.top + "%", width: LEV_COVER.w + "%", height: LEV_COVER.h + "%", opacity: pressed ? 1 : 0 }} />
        <img src={PRESS_SPR} alt="" className="lc-sp" draggable={false} style={{ left: LEV_DOWN.left + "%", top: LEV_DOWN.top + "%", width: LEV_DOWN.w + "%", height: LEV_DOWN.h + "%", opacity: pressed ? 1 : 0 }} />
        {REELS.map((R, r) => {
          const canHold = !spinning && !jammed && !crisis && screen === "play" && (held[r] || holdCharges > 0);
          return (
            <div
              key={r}
              className={"lc-reel" + (held[r] ? " held" : "") + (canHold ? " holdable" : "")}
              onClick={canHold ? () => toggleHold(r) : undefined}
              style={{ left: R.l + "%", top: WIN_TOP + "%", width: R.w + "%", height: WIN_H + "%" }}
            >
              <div className="lc-strip" style={{
                transform: "translateY(" + reelY(r) + "px)",
                transition: (phase === "run" && !spinHeld[r]) ? ("transform " + durations[r] + "s cubic-bezier(.13,.66,.18,1)") : "none",
              }}>
                {strips[r].cells.map((k, i) => (
                  <div key={i} className="lc-cell" style={{ height: cellH }}>
                    {cellH > 0 && <Ink k={k} size={symSizeFor(r)} />}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div className="lc-shadow" style={{ top: WIN_TOP + "%", left: REELS[0].l + "%", width: (REELS[2].l + REELS[2].w - REELS[0].l) + "%", height: (WIN_H * 0.16) + "%" }} />
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

        {screen === "play" && !spinning && !jammed && !crisis && (
          <div className="lc-pullhint" aria-hidden="true">
            <svg viewBox="0 0 64 42" preserveAspectRatio="xMidYMid meet">
              <text x="32" y="12" textAnchor="middle" fontFamily="Jost,Arial,sans-serif" fontSize="14" fontWeight="700" letterSpacing="1.5" fill="#141414">PULL</text>
              <path d="M8 19 H56 L32 40 Z" fill="#141414" />
            </svg>
          </div>
        )}
        <button className="lc-lever" onClick={spin} disabled={spinning || jammed || !!crisis} title="tire le levier" aria-label="pull" />
      </div>
      </div>

      <div className="lc-readout">
        {jammed
          ? <span className="lc-neg">machine bloquée · répare-la</span>
          : (bet < 1 && hasAssets && screen === "play")
          ? <span className="lc-neg">à sec · vends un bien</span>
          : flash ? <span className="lc-flash">{flash}</span>
          : (lastWin && lastWin.neg) ? <span className="lc-neg">{lastWin.neg === "skull" ? "ruine évitée" : "panne"}</span>
          : <span className="lc-idle">une pièce a tout commencé · un tour peut tout finir</span>}
      </div>

      <div className="lc-gauges">
        <Gauge kind="hope" pct={hope} hot={hope <= 25} />
        <Gauge kind="risk" pct={risk} hot={hot} />
      </div>

      {(holdCharges > 0 || held.some(Boolean)) && (
        <div className="lc-holdbar">
          <Ink k="bolt" size={13} />
          <b>×{holdCharges}</b>
          <em>{held.some(Boolean) ? "rouleau bloqué · tire le levier" : "tape un rouleau pour le bloquer"}</em>
        </div>
      )}

      <div className="lc-ctrl">
        {jammed
          ? <button className="lc-repair" disabled={cash < repairCost} onClick={repair}>réparer · {fmt(repairCost)}</button>
          : <div className="lc-betwrap">
              <div className="lc-betbar">
                <button className="lc-bb" disabled={spinning || betIdx <= 0} onClick={betDown}>–</button>
                <div className="lc-betcoin" title="mise">
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
                <button className="lc-bb" disabled={spinning || betIdx >= maxBetIdx} onClick={betUp}>+</button>
              </div>
              <button className="lc-bmax" disabled={spinning} onClick={betMax}>mise max</button>
            </div>}
      </div>

      <div className="lc-shopbtns">
        <button className="lc-sb" disabled={spinning} onClick={() => setOverlay("buy")}>Acheter</button>
        <button className="lc-sb" disabled={spinning} onClick={() => setOverlay("assets")}>Ma vie{ownedCount ? " · " + ownedCount : ""}</button>
      </div>

      <div className="lc-pay">
        {PAY_ROW.map((k) => (
          <span key={k} className="lc-pr" title={SYM_NAME[k]}><Ink k={k} size={16} faint /> ×{PAY3[k]}</span>
        ))}
        <span className="lc-pr" title="Joker"><Ink k="joker" size={16} faint /> wild</span>
        <span className="lc-pr danger" title="Skull / Crack"><Ink k="skull" size={16} faint /> danger</span>
      </div>

      {screen === "intro" && (
        <Ovl><div className="lc-modal">
          <div className="lc-mt">LAST COIN</div>
          <p className="lc-ms">la dernière pièce</p>
          <div className="lc-rules">
            <p>Tu dors dans un garage. Boulot perdu, couple fini, compte vide.</p>
            <p>Un soir, tu trouves cette machine à sous abandonnée sur le trottoir. Sale, cabossée — mais elle marche encore.</p>
            <p>Il te reste <b>une pièce</b>.</p>
            <p className="lc-tag">« Une pièce a tout commencé. Un tour peut tout finir. »</p>
          </div>
          <button className="lc-btn" onClick={() => setScreen("play")}>insérer la pièce</button>
          <p className="lc-disc">argent fictif · aucun paiement réel</p>
        </div></Ovl>
      )}

      {screen === "pause" && (
        <Ovl><div className="lc-modal">
          <div className="lc-mh">PAUSE</div>
          <p className="lc-ms">niveau {level} · {socialClass} · {fmt(netWorth)}</p>
          {!confirmReset ? (
            <div className="lc-menucol">
              <button className="lc-btn" onClick={() => setScreen("play")}>reprendre</button>
              <button className="lc-btn ghost" onClick={() => { setScreen("play"); setOverlay("rules"); }}>règles</button>
              <button className="lc-btn ghost" onClick={() => setConfirmReset(true)}>recommencer</button>
            </div>
          ) : (
            <div className="lc-menucol">
              <p className="lc-mb">tout perdre et repartir d'une seule pièce ?</p>
              <button className="lc-btn" onClick={newGame}>oui</button>
              <button className="lc-btn ghost" onClick={() => setConfirmReset(false)}>non</button>
            </div>
          )}
          <p className="lc-disc">argent fictif · aucun paiement réel</p>
        </div></Ovl>
      )}

      {overlay === "buy" && (
        <Ovl><div className="lc-modal wide">
          <p className="lc-el">ma vie · améliorer</p>
          <div className="lc-en">monte de classe sociale</div>
          <p className="lc-ms">Cash : {fmt(cash)} · un nouveau palier remplace l'ancien</p>
          <div className="lc-list">
            {FAM.map((f) => {
              const L = lvl[f.id];
              const cur = L > 0 ? f.tiers[L - 1] : null;
              const next = L < f.tiers.length ? f.tiers[L] : null;
              const netCost = next ? next.price - (cur ? cur.resale : 0) : 0;
              const ok = next && cash >= netCost;
              return (
                <div className="lc-fam" key={f.id}>
                  <div className="lc-famh">{f.name}{f.life ? "" : " · revenu"}<span>{cur ? cur.n : f.start}</span></div>
                  {next
                    ? <button className={"lc-up" + (ok ? "" : " off")} disabled={!ok} onClick={() => buyNext(f)}>
                        <span className="lc-upn">{next.n}{next.inc ? " · +" + fmt(next.inc) + "/tour" : ""}{cur ? <i>remplace {cur.n}</i> : null}</span>
                        <span className="lc-upp">{fmt(netCost)}</span>
                      </button>
                    : <div className="lc-max">max atteint</div>}
                </div>
              );
            })}
          </div>
          <button className="lc-btn" onClick={() => setOverlay(null)}>retour</button>
        </div></Ovl>
      )}

      {overlay === "assets" && (
        <Ovl><div className="lc-modal wide">
          <p className="lc-el">ma vie</p>
          <div className="lc-en">{socialClass}</div>
          <p className="lc-ms">niveau {level} · {venue} · patrimoine {fmt(netWorth)}{income > 0 ? " · +" + fmt(income) + "/tour" : ""}</p>
          <div className="lc-list">
            {FAM.map((f) => {
              const L = lvl[f.id];
              const cur = L > 0 ? f.tiers[L - 1] : null;
              return (
                <div key={f.id} className="lc-row own">
                  <span className="lc-rn">{cur ? cur.n : f.start}<i>{f.name}{cur && cur.inc ? " · +" + fmt(cur.inc) + "/tour" : ""}</i></span>
                  {cur
                    ? <button className="lc-sell" onClick={() => sellFam(f)}>vendre · {fmt(cur.resale)}</button>
                    : <span className="lc-rp">—</span>}
                </div>
              );
            })}
          </div>
          <p className="lc-disc" style={{ marginBottom: 18 }}>la revente fait mal — tu repars de zéro dans la famille</p>
          <button className="lc-btn" onClick={() => setOverlay(null)}>retour</button>
        </div></Ovl>
      )}

      {overlay === "rules" && (
        <Ovl><div className="lc-modal wide">
          <p className="lc-el">règles</p>
          <div className="lc-en">comment ça marche</div>
          <p className="lc-ms">mise · tire le levier · encaisse ou re-risque</p>
          <div className="lc-list">
            <div className="lc-acth">symboles</div>
            {SYM_INFO.map(([k, t]) => (
              <div key={k} className="lc-rule">
                <Ink k={k} size={26} />
                <div className="lc-rule-txt">
                  <b>{SYM_NAME[k]}{PAY3[k] && !NEG[k] && k !== "joker" ? " · ×" + PAY3[k] : ""}</b>
                  <i>{t}</i>
                </div>
              </div>
            ))}
            <div className="lc-acth">combinaisons</div>
            <div className="lc-combo"><b>3 identiques</b><i>gain selon le symbole (×3 à ×75)</i></div>
            <div className="lc-combo"><b>2 identiques</b><i>petit gain (paire)</i></div>
            <div className="lc-combo"><b>2 + Joker</b><i>compté comme 3 identiques</i></div>
            <div className="lc-combo"><b>3 Jokers</b><i>jackpot ×95</i></div>
            <div className="lc-combo"><b>3 Crâne / 3 Fissure</b><i>danger — mise perdue</i></div>

            <div className="lc-acth">moral &amp; risque</div>
            <div className="lc-rule">
              <Gauge kind="hope" pct={70} />
              <div className="lc-rule-txt"><b>Moral (le cœur)</b><i>ta résistance aux coups durs. Monte quand tu gagnes et quand tu améliores ta vie (surtout le logement). Tombe sur les pertes, les crises et les reventes. À zéro : c'est la spirale — tu perds gros et tu redescends d'un cran.</i></div>
            </div>
            <div className="lc-rule">
              <Gauge kind="risk" pct={80} />
              <div className="lc-rule-txt"><b>Risque (le triangle)</b><i>ton exposition au danger. Monte quand tu mises gros et quand ton train de vie est voyant. Plus il est haut, plus les crises tombent souvent (loyer, fisc, cambriolage, saisie). Il redescend tout seul si tu joues petit.</i></div>
            </div>
            <div className="lc-acth">HOLD · bloquer un rouleau</div>
            <div className="lc-rule">
              <Ink k="bolt" size={26} />
              <div className="lc-rule-txt"><b>Cartes HOLD</b><i>une paire de Bolt fait tomber 1 carte, un triple en fait tomber 2 (plafond 9). Avant de tirer, tape un rouleau pour le bloquer : il garde son symbole au tour suivant. Coût : 1 carte par rouleau bloqué.</i></div>
            </div>
          </div>
          <p className="lc-ms">petite mise = sûr mais lent · grosse mise = gros gains ou ruine</p>
          <button className="lc-btn" onClick={() => setOverlay(null)}>retour</button>
        </div></Ovl>
      )}

      {crisis && (
        <Ovl><div className="lc-modal">
          <div className="lc-mh">{CRISIS[crisis.id].t}</div>
          <p className="lc-ms">{CRISIS[crisis.id].s}</p>
          {crisis.id === "loyer" ? (
            <><p className="lc-mb">à payer : {fmt(crisis.amount)}</p>
              <div className="lc-crow">
                <button className="lc-btn" disabled={cash < crisis.amount} onClick={payCrisis}>payer</button>
                <button className="lc-btn ghost" onClick={refuseCrisis}>refuser</button>
              </div></>
          ) : crisis.id === "fisc" ? (
            <><p className="lc-mb">taxe : {fmt(crisis.amount)}</p><button className="lc-btn" onClick={payCrisis}>payer</button></>
          ) : crisis.id === "cambriolage" ? (
            <><p className="lc-mb">tu perds une partie de ton cash</p><button className="lc-btn" onClick={payCrisis}>encaisser</button></>
          ) : crisis.id === "venteforcee" ? (
            <><p className="lc-mb">ton bien le plus cher est saisi</p><button className="lc-btn" onClick={payCrisis}>subir</button></>
          ) : (
            <><p className="lc-mb">tu redescends d'un cran — mais tu gardes une pièce</p><button className="lc-btn" onClick={payCrisis}>encaisser</button></>
          )}
        </div></Ovl>
      )}

      {screen === "empire" && (
        <Ovl><div className="lc-modal">
          <div className="lc-mh">EMPIRE</div>
          <p className="lc-ms">la ville a ton nom</p>
          <p className="lc-mb">Parti d'une pièce. Regarde-toi.</p>
          <p className="lc-tag">« La ville porte ton nom. La machine veut encore une pièce. »</p>
          <div className="lc-crow">
            <button className="lc-btn" onClick={() => setScreen("play")}>encore un tour</button>
            <button className="lc-btn ghost" onClick={newGame}>recommencer</button>
          </div>
        </div></Ovl>
      )}

      {screen === "over" && (
        <Ovl><div className="lc-modal">
          <div className="lc-mh">À SEC</div>
          <p className="lc-ms">tout est parti</p>
          <p className="lc-mb">patrimoine atteint : {fmt(netWorth)}</p>
          <p className="lc-tag">« Une dernière pièce. La machine attend. »</p>
          <button className="lc-btn" onClick={newGame}>recommencer</button>
        </div></Ovl>
      )}

      {levelUp && (
        <div className="lc-levelup" key={levelUp.k}>
          <div className="lc-lu-l">niveau {levelUp.n} · nouveau statut</div>
          <div className="lc-lu-n">{levelUp.cls}</div>
        </div>
      )}

      {cardNotif && (
        <div className="lc-cardnotif" key={cardNotif.k}>
          <Ink k="bolt" size={32} />
          <div className="lc-cn-body">
            <span className="lc-cn-l">carte HOLD</span>
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
.lc-menu{display:flex;gap:3px;align-items:center;justify-content:center;width:28px;height:28px;border:1px solid #141414;background:none;cursor:pointer;padding:0;flex-shrink:0;align-self:center;transition:.15s;}
.lc-menu i{width:3px;height:11px;background:#141414;display:block;transition:.15s;}
.lc-menu:hover{background:#141414;}
.lc-menu:hover i{background:#fff;}
.lc-menucol{display:flex;flex-direction:column;gap:10px;align-items:center;margin:4px 0 2px;}
.lc-menucol .lc-btn{min-width:180px;}
.lc-cash{display:flex;flex-direction:column;align-items:flex-start;}
.lc-cash>i{font-style:normal;font-size:9px;letter-spacing:2px;color:#787878;text-transform:uppercase;}
.lc-cash>b{font-weight:600;font-size:27px;letter-spacing:1px;line-height:1.02;}
.lc-cash>em{font-style:normal;font-size:10px;color:#9a9a9a;letter-spacing:.5px;margin-top:2px;}
.lc-level{display:flex;flex-direction:column;align-items:flex-end;text-align:right;}
.lc-level>i{font-style:normal;font-size:9px;letter-spacing:2px;color:#787878;text-transform:uppercase;}
.lc-level>b{font-weight:600;font-size:14.5px;letter-spacing:1.5px;text-transform:uppercase;line-height:1.1;margin-top:1px;}
.lc-pips{display:flex;gap:4px;margin-top:7px;}
.lc-pip{width:8px;height:8px;transform:rotate(45deg);border:1px solid #d2d2d2;}
.lc-pip.on{background:#141414;border-color:#141414;}
.lc-head{text-align:center;}
.lc-mark{font-size:13px;font-weight:500;letter-spacing:8px;padding-left:8px;}
.lc-sub{font-size:10px;letter-spacing:3px;color:#707070;margin-top:5px;}
.lc-top{display:flex;gap:26px;align-items:flex-end;justify-content:center;flex-wrap:wrap;}
.lc-stat{display:flex;flex-direction:column;align-items:center;gap:2px;}
.lc-stat i{font-style:normal;font-size:9px;letter-spacing:2px;color:#787878;text-transform:uppercase;}
.lc-stat b{font-weight:400;font-size:16px;letter-spacing:1px;}
.lc-stat.big b{font-size:24px;font-weight:500;}
.lc-stage{width:100%;max-width:300px;}
.lc-stage.shake{animation:shake .4s ease;}
@keyframes shake{0%,100%{transform:translate(0,0);}15%{transform:translate(-2px,1px);}30%{transform:translate(2px,-1px);}45%{transform:translate(-2px,0);}60%{transform:translate(2px,1px);}75%{transform:translate(-1px,-1px);}}
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
.lc-gc{width:100%;height:100%;border-radius:50%;filter:blur(1.6px);transform:scaleX(.18);
  background:radial-gradient(50% 50% at 50% 50%,rgba(20,20,20,.75),rgba(20,20,20,.48) 55%,rgba(20,20,20,0) 100%);}
.lc-gyrocoin.on .lc-gc{animation:coinspin .5s linear infinite;}
@keyframes coinspin{0%{transform:scaleX(1);}25%{transform:scaleX(.1);}50%{transform:scaleX(1);}75%{transform:scaleX(.1);}100%{transform:scaleX(1);}}
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
.lc-reel.holdable{cursor:pointer;}
.lc-reel.held{outline:2px solid #141414;outline-offset:-2px;}
.lc-reel.held::after{content:"HOLD";position:absolute;left:50%;bottom:0;transform:translateX(-50%);font-size:8px;letter-spacing:2px;font-weight:600;color:#fff;background:#141414;padding:1px 6px;pointer-events:none;z-index:3;}
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
.lc-gauges{display:flex;gap:40px;align-items:flex-start;justify-content:center;}
.lc-holdbar{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:1px;color:#444;margin-top:-4px;}
.lc-holdbar b{font-weight:600;letter-spacing:.5px;}
.lc-holdbar em{font-style:normal;font-size:10px;letter-spacing:.3px;color:#888;}
.lc-gauge{display:flex;flex-direction:column;align-items:center;gap:3px;}
.lc-gauge svg{width:30px;height:30px;display:block;}
.lc-gauge span{font-size:8px;letter-spacing:2px;color:#707070;text-transform:uppercase;}
.lc-gauge.hot svg{animation:hotp .5s ease infinite alternate;}
@keyframes hotp{from{opacity:.4;}to{opacity:1;}}
.lc-repair{background:#141414;color:#fff;border:1px solid #141414;cursor:pointer;font-family:inherit;font-size:12px;letter-spacing:4px;padding:10px 26px;text-transform:uppercase;animation:hotp .6s ease infinite alternate;}
.lc-repair:disabled{background:#fff;color:#dcdcdc;border-color:#dcdcdc;cursor:default;animation:none;}
.lc-crow{display:flex;gap:12px;justify-content:center;}
.lc-btn.ghost{background:#fff;color:#141414;}
.lc-btn.ghost:hover{background:#141414;color:#fff;}
.lc-readout{height:38px;display:flex;align-items:center;justify-content:center;text-align:center;padding:3px 16px;}
.lc-win{font-size:25px;font-weight:300;letter-spacing:1px;}
.lc-win.big{font-weight:500;}
.lc-lose{font-size:22px;color:#b4b4b4;}
.lc-neg{font-size:12px;letter-spacing:3px;color:#9a9a9a;text-transform:uppercase;}
.lc-idle{font-size:10px;letter-spacing:2px;color:#7f7f7f;}
.lc-flash{font-size:11px;letter-spacing:.5px;color:#666;font-style:italic;line-height:1.35;max-width:380px;}
.lc-ctrl{display:flex;align-items:center;gap:20px;margin-top:2px;flex-wrap:wrap;justify-content:center;}
.lc-betwrap{display:flex;flex-direction:column;align-items:center;gap:8px;}
.lc-betbar{display:flex;align-items:center;gap:18px;}
.lc-betcoin{position:relative;width:66px;height:66px;display:flex;align-items:center;justify-content:center;}
.lc-coinart{position:absolute;inset:0;width:100%;height:100%;display:block;}
.lc-betnum{position:relative;z-index:1;font-weight:600;font-size:14px;letter-spacing:.3px;line-height:1;}
.lc-bb{width:28px;height:28px;border:1px solid #141414;background:none;cursor:pointer;font-family:inherit;font-size:16px;color:#141414;line-height:1;}
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
.lc-shopbtns{display:flex;gap:14px;}
.lc-sb{background:none;border:1px solid #d9d9d9;color:#555;cursor:pointer;font-family:inherit;
  font-size:11px;letter-spacing:2px;padding:7px 18px;transition:.15s;}
.lc-sb:hover:not(:disabled){border-color:#141414;color:#141414;}
.lc-sb:disabled{color:#dcdcdc;border-color:#ededed;cursor:default;}
.lc-pay{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;align-items:center;
  font-size:11px;color:#868686;letter-spacing:1px;margin-top:2px;}
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
.lc-rules{text-align:left;display:flex;flex-direction:column;gap:11px;font-size:13px;line-height:1.55;color:#444;margin-bottom:22px;}
.lc-rules b{color:#141414;font-weight:500;}
.lc-tag{color:#141414;font-style:italic;letter-spacing:.5px;text-align:center;margin-top:4px;}
.lc-btn{background:#141414;color:#fff;border:1px solid #141414;cursor:pointer;font-family:inherit;
  font-size:13px;letter-spacing:5px;padding:11px 30px 11px 35px;transition:.15s;}
.lc-btn:hover{background:#fff;color:#141414;}
.lc-disc{font-size:9px;letter-spacing:2px;color:#8a8a8a;margin-top:16px;}
.lc-el{font-size:10px;letter-spacing:4px;color:#707070;text-transform:uppercase;}
.lc-en{font-size:26px;font-weight:300;letter-spacing:2px;margin:6px 0 2px;}
.lc-list{margin:14px 0 20px;max-height:48vh;overflow-y:auto;text-align:left;}
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
