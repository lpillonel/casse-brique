# Casse-brique — shell d'atelier

Squelette Vite + React + TypeScript

```bash
npm install
npm run dev
```

## Structure

- `src/game/` : logique pure, sans React (`engine.ts` = `step(state, input, dt)`, `render.ts` = dessin canvas, `constants.ts`)
- `src/hooks/` : `useGame` (boucle `requestAnimationFrame` + état), `useKeyboard`
- `src/components/` : `GameCanvas`, `Hud`, `Overlay`
- `src/App.tsx` : assemblage

## Déjà fonctionnel

Menu Jouer / Pause / Rejouer, paddle au clavier (← → ou A / D), balle qui rebondit sur les murs, briques affichées, HUD score et vies.

## Exercices (cherchez `TODO(atelier` dans `src/game/engine.ts`)

1. Collision balle / paddle (bonus : angle selon le point d'impact)
2. Collision balle / briques + score + victoire
3. Perte de vie, reset de la balle, game over
4. Bonus libres : niveaux, vitesse croissante, souris/tactile, high score en `localStorage`, sons
