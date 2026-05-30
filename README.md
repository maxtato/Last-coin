# Last Coin

Machine à sous **narrative** en React + TypeScript. Tu commences avec **une seule
pièce** et une vieille machine trouvée sur le trottoir. Mise, tire le levier,
encaisse ou re-risque — et tente de reconstruire une vie, puis un empire.

Style : noir & blanc, gravé, sec et ironique. Interface en français, termes et
répliques en anglais.

> One coin started it. One pull can end it.
> Argent fictif · aucun paiement réel.

## Démarrer

```bash
npm install
npm run dev
```

Puis ouvrir l'URL affichée (par défaut http://localhost:5173).

## Build de production

```bash
npm run build
npm run preview
```

## Boucle de jeu (Phase 1)

- **Mise réglable** (`– / + / max`) qui passe à l'échelle de 1 à des milliards.
- **Tire le levier** : 3 rouleaux, table de gains ci-dessous.
- **Cash** : ce que tu peux miser. **Net Worth** : cash + valeur du patrimoine.
- **Buy** : convertis le cash en biens (Actes 1-2). Certains donnent un **revenu passif**.
- **Patrimoine** : revends en urgence — *la revente fait mal*.
- À sec et plus rien à vendre = fin de partie → tu repars avec une pièce.

La machine est **clémente au garage** (boost de chance `Luck` au début), puis
plus dure ensuite. Les grosses mises montent vite… ou ruinent.

### Symboles & gains

| Symbole | 3 alignés | Rôle |
|---|---|---|
| Coin | ×3 | gain de base |
| Star | ×9 | chance |
| House | ×13 | patrimoine |
| Car | ×19 | statut |
| Crown | ×75 | revanche (rare) |
| Joker | wild | complète une combinaison · 3 jokers = ×95 |
| Skull / Crack | — | danger (effets réels en Phase 2) |

Une paire paie un petit gain. RTP de base ≈ 107 %.

## Structure

- `src/LastCoin.tsx` — le jeu (logique, UI, styles, symboles SVG).
- `src/assets.ts` — sprites de la machine (images base64, isolées pour garder le jeu lisible).
- `src/main.tsx` — point d'entrée React.
- `index.html` — page hôte.

## Feuille de route

- **Phase 1 (faite)** : symboles, table de gains, Cash/Net Worth, ~20 achats + revente, revenu passif, sauvegarde.
- **Phase 2** : jauges Hope & Risk, crises, événements narratifs, améliorations machine.
- **Phase 3** : machine 10 niveaux, capacités (Hold, Second Pull, Nudge…), Actes 3-5 (empire → lune), fins multiples.
- **Phase 4** : direction visuelle gravée, équilibrage 0 → 500 Md.
