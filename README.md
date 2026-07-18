# sf-games

City-wide transit/scavenger-style games around San Francisco (turf war, hide & seek, scavenger hunt, lockout, and more to come) — think [Jet Lag: The Game](https://www.youtube.com/@JetLagTheGame), but browser-based lobbies instead of a film crew.

Players pick a game, create or join a lobby with a code/invite link, and play. Each game works differently under the hood, but they all share one lobby/team/routing framework so adding a new game later doesn't mean rebuilding the site.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vite + React + TypeScript + Tailwind v4 | Fast dev loop, plain SPA is enough for this |
| Hosting / CDN / domain | Cloudflare Pages | Free tier, auto-deploys from git, handles TLS/domain |
| Database + Auth + Realtime | Supabase (Postgres) | Free tier covers this scale easily; Realtime broadcasts game events (e.g. "zone claimed") to every connected browser |
| Trusted game logic | Supabase Edge Functions | The only thing allowed to mutate game state (create game, join, claim a zone, resolve a veto, ...) — avoids client race conditions and cheating via local state edits |
| Maps (turf war and similar) | Mapbox GL JS | Free tier (50k loads/mo); a "load" is per page load, not per repaint, so live recoloring zones from Realtime events is free |

## Architecture

- **Generic layer** (this scaffold): `game_types`, `games`, `teams`, `players` — lobby creation, join codes, team assignment. Reusable across every game.
- **Per-game layer** (built as each game ships): its own tables keyed off `games.id`, e.g. turf war's `zones`, `zone_state`, `zone_adjacency`, `challenge_deck`.
- **Client-side extensibility seam**: [`src/lib/gameRegistry.ts`](src/lib/gameRegistry.ts). A game is a `GameModule` (lobby settings UI + board UI). The router/lobby code looks games up by slug and never imports a specific game's code directly — adding a game means writing `src/routes/games/<slug>/{Board,LobbySettings,register}.tsx` and importing `register` once.
- **Trust boundary**: tables are `select`-only from the browser (see RLS policies in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)). All writes go through edge functions using the secret key, which is where atomic state transitions (claim races, veto windows, deck replenishment) live.

## Data lifecycle

Game instances are meant to be ephemeral, not permanent records:

- **Host cancels a lobby** — a "Cancel lobby" button in the lobby screen (host-only, pre-start) deletes the `games` row immediately, cascading to its `teams`/`players`/instance-state rows. Other players' browsers notice via Realtime and get redirected home.
- **Abandoned/stale games get swept automatically** — `cleanup_stale_games()` runs every 15 minutes via `pg_cron` (see `supabase/migrations/0013_lobby_cleanup.sql`): lobbies never started are removed after 3 hours, finished (`completed`/`cancelled`) games after 12 hours (long enough to see final standings), and any `active` game after 24 hours as a safety net in case a game type's own end-of-round logic didn't fire. None of this needs a host to still be around — closing the tab is enough.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + publishable key
npm run dev
```

Visit `http://localhost:5173`. The landing page queries the `game_types` table — with no Supabase project configured yet, it shows a setup notice instead of crashing; once configured with no rows seeded, it shows "no games are live yet."

### Supabase setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Install the CLI (`npm i -g supabase` or use `npx supabase`) and run:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push   # applies supabase/migrations
   ```
3. Copy the project URL and **publishable key** (not the secret key) from **Project Settings → API Keys** into `.env.local`. The publishable key is safe for the browser — it's the direct replacement for the old "anon" key, and RLS still governs what it can read/write. The secret key replaces the old "service_role" key and must only ever be used server-side (edge functions); never put it in a `VITE_`-prefixed variable, since Vite inlines those into the client bundle.
4. (Optional, once you need trusted writes) deploy the example edge function to confirm the pipeline works end to end:
   ```bash
   npx supabase functions deploy hello-world
   ```
5. Supabase free-tier projects pause after a week of inactivity — [`.github/workflows/keep-supabase-alive.yml`](.github/workflows/keep-supabase-alive.yml) pings the project daily via GitHub Actions to prevent that. Requires no setup beyond this repo being on GitHub with Actions enabled (the default).
6. Optional: connect the GitHub repo under **Project Settings → Integrations → GitHub**, and enable migration deploys so `supabase/migrations/*.sql` applies automatically on push to `main`. Skip the "branching" / preview-database option — that's a staging-environment feature aimed at teams, not needed here and can incur cost beyond the free allowance.

### Cloudflare Pages setup

1. Push this repo to GitHub.
2. In the Cloudflare dashboard, create a Pages project connected to the repo.
3. Build command: `npm run build`. Build output directory: `dist`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as Pages environment variables (same values as `.env.local`).
5. Attach your domain under the Pages project's custom domains tab.

## Project layout

```
src/
  components/Layout.tsx     shared header/footer shell
  routes/                   pages (Landing today; games/<slug>/ later)
  lib/supabaseClient.ts     Supabase client, safe to import even if unconfigured
  lib/gameRegistry.ts       game module registry (the extensibility seam)
  types/database.ts         hand-maintained mirror of the DB schema
  types/game.ts             GameModule interface every game implements
supabase/
  migrations/0001_init.sql  generic lobby schema (game_types, games, teams, players)
  functions/hello-world/    example edge function
```

## What's next

This scaffold intentionally stops before any specific game. Next steps, in rough order:

1. Seed a `game_types` row and build the first game (turf war) as a `GameModule` to prove the extensibility seam holds up in practice.
2. Add the turf war schema (`zones`, `zone_state`, `zone_adjacency`, `challenge_deck`) and its edge functions (create game, join, claim zone, propose/veto discard).
3. Seed SF neighborhood boundaries (GeoJSON from [data.sfgov.org](https://data.sfgov.org)) and wire up the Mapbox layer, recoloring zones client-side off Supabase Realtime events.
