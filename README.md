# AetherPlay

AetherPlay — browser-only gaming platform with account onboarding, mini-games, animated roulette, and leaderboard persistence in `localStorage`.

## Features

- SPA navigation: Home, Library, Leaderboard, Account
- Seamless registration/login by email + password
- Mini-games: Guess, Reaction, Memory, Roulette
- Animated SVG-first UI with responsive layout
- Session and score persistence in local storage

## Run locally

Open `index.html` directly in a browser.

For a local server:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## Project structure

- `index.html` — app shell and view templates
- `styles.css` — theme, layouts, game visuals, roulette animation
- `app.js` — routing, auth/session, game logic, score persistence
