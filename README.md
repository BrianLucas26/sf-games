# sf-games

City-wide transit/scavenger-style games around San Francisco (turf war, hide & seek, scavenger hunt, lockout, and more to come) — think [Jet Lag: The Game](https://www.youtube.com/@JetLagTheGame), but browser-based lobbies instead of a film crew.

Players pick a game, create or join a lobby with a code/invite link, and play. Each game works differently under the hood, but they all share one lobby/team/routing framework so adding a new game later doesn't mean rebuilding the site.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vite + React + TypeScript + Tailwind v4 | Fast dev loop, plain SPA is enough for this |
| Hosting / CDN / domain | Cloudflare Workers (static assets) | Free tier, auto-deploys from git via `wrangler` (see [`wrangler.jsonc`](wrangler.jsonc)), handles TLS/domain |
| Database + Auth + Realtime | Supabase (Postgres) | Free tier covers this scale easily; Realtime broadcasts game events (e.g. "zone claimed") to every connected browser |
| Trusted game logic | Supabase Edge Functions | The only thing allowed to mutate game state (create game, join, claim a zone, resolve a veto, ...) — avoids client race conditions and cheating via local state edits |
| Maps (turf war and similar) | Mapbox GL JS | Free tier (50k loads/mo); a "load" is per page load, not per repaint, so live recoloring zones from Realtime events is free |

## Architecture

- **Generic layer**: `game_types` (`slug`/`id`/`is_active` only — see [Content](#content) below), `games`, `teams`, `players` — lobby creation, join codes, team assignment. Reusable across every game.
- **Per-game layer** (built as each game ships): its own tables keyed off `games.id`, e.g. Turf War's `turf_war_zones`, `turf_war_captures`, `turf_war_discard_proposals`, `turf_war_secret_zones`, `turf_war_game_state`; Lockout's `lockout_cells`, `lockout_game_state`; Hide and Seek's `hide_and_seek_rounds`, `hide_and_seek_questions`, `hide_and_seek_hand_cards`, `hide_and_seek_map_marks` (and friends — see `0037_hide_and_seek_schema.sql`). Static content (challenge text, game type names/descriptions) is *not* stored in any of these tables — see [Content](#content) below.
- **Client-side extensibility seam**: [`src/lib/gameRegistry.ts`](src/lib/gameRegistry.ts). A game is a `GameModule` (lobby settings UI + board UI). The router/lobby code looks games up by slug and never imports a specific game's code directly — adding a game means writing `src/games/<slug>/{Board,LobbySettings,register}.tsx` and importing `register` once from `src/App.tsx`.
- **Trust boundary**: tables are `select`-only from the browser (see RLS policies in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)). All writes go through edge functions using the secret key, which is where atomic state transitions (claim races, veto windows, zone replenishment) live.

## Content

Static reference content that's never mutated at runtime — challenge/prompt
banks, game type names/descriptions, anything similar for future games —
lives in git under [`content/`](content), not the database:
`content/turf-war-challenges.ts` (keyed by neighborhood slug),
`content/lockout-challenges.ts` (a flat pool Lockout samples from at game
start -- each entry is a short `prompt` shown directly on the grid tile plus
an optional longer `description` shown when a player taps the cell),
`content/hide-and-seek-questions.ts` / `content/hide-and-seek-curses.ts`
(Hide and Seek's question bank, each with its draw/keep cost, and the curse
deck hiders draw from -- transcribed from the Jet Lag: The Game hide and
seek cards, with each card's "[S.., M.., L..]" values resolved from the
lobby's game-size setting), and
`content/game-types.ts` (name/description per game slug —
`game_types` itself only keeps `slug`/`id`/`is_active`, see Architecture
above). Edit the file and push to `main`; that's the entire deploy step:

- The frontend imports these files directly into its build, so content
  changes go live the moment Cloudflare finishes its normal auto-deploy —
  no extra step.
- `lockout-start` (an edge function) also imports `content/lockout-challenges.ts`
  directly (as do the `hide-and-seek-*` functions with their two content
  files), but edge functions only pick up code changes when explicitly
  redeployed. [`.github/workflows/deploy-functions.yml`](.github/workflows/deploy-functions.yml)
  handles that automatically on every push touching `supabase/functions/**`
  or `content/**` — see the `SUPABASE_ACCESS_TOKEN` setup step below.

## Abuse protection

Every table is `select`-only from the browser (see Architecture above) —
direct writes through the public REST API aren't possible. But `select`
itself is currently wide open (`using (true)` on every table), and RLS has
no way to distinguish "the client filtered by a known id" from "the client
listed everything" — both are evaluated identically per row. **This means
`games`/`players`/`teams` are fully enumerable today**: anyone with the
publishable key (which is public in the JS bundle regardless) can list
every game ever created, including its join code, and every player's
display name. Closing this properly means moving those reads off raw table
access onto RPCs that require a specific id/code, which also touches how
Realtime subscriptions authorize (`postgres_changes` honors the same RLS
policies) — a real migration, not a quick patch, and intentionally not done
yet. The mitigations below reduce the *consequences* of that gap without
requiring it first:

- **Cloudflare Turnstile** gates `create-game` and `join-game` — the two
  writes a script could otherwise spam with zero friction. The token is
  verified server-side in the edge function itself
  (`supabase/functions/_shared/verifyTurnstile.ts`), which matters because
  Cloudflare's own Bot Fight Mode/WAF only sees traffic hitting your
  *site's* domain — a script calling `*.supabase.co/functions/v1/create-game`
  directly (using the publishable key, which is public in the JS bundle
  either way) never touches Cloudflare at all. Turnstile verification is the
  one control that still catches that.
- **Rate limiting** (`supabase/migrations/0026_rate_limiting.sql`,
  `supabase/functions/_shared/rateLimit.ts`) caps `claim-zone`/`claim-cell`/
  `undo-claim`/`select-team`/`propose-discard`/`veto-discard` at 10-20
  requests/minute per caller, and `download-game-photos` at 5/minute.
  Turnstile only gates the entry points; once someone has a real player row
  (via one Turnstile-gated join), nothing else throttled how many times they
  could hit these. Fixed-window, keyed by the caller's auth user id (already
  resolved by every one of these via `getRequestUser()`), fails open on a
  DB error so a rate-limiter outage can't take down real gameplay.
- **`download-game-photos` requires actual game membership.** It used to
  only check "is this caller signed in," not "is this caller a player in
  this game" — combined with table enumeration above, anyone could trigger
  it for any game, and each call fans out into N photo fetches + zip
  compression server-side. One cheap request causing that much server-side
  work is a textbook amplification vector; it's now gated on a real
  `players` row for that game.
- **Player and total-game caps** — `join-game` rejects at 40 players per
  game, `create-game` rejects at 200 concurrent lobby/active games
  system-wide. Both are safety nets, not expected to bind in normal use
  (`cleanup-games` already sweeps stale lobbies) — they just bound the
  worst case if Turnstile is ever bypassed at scale.
- **Storage bucket limits** (`supabase/migrations/0025_limit_claim_photo_uploads.sql`)
  cap claim-photo uploads to 10MB and image MIME types only — the upload
  policy in `0004_storage.sql` only checks "is this an authenticated
  session" (anonymous sessions qualify), and Storage writes go straight
  through Supabase's Storage API, bypassing edge functions and Turnstile
  entirely, so this needed its own limit.

**Recommended dashboard settings (not code, do these yourself):**
- Mapbox → your token → add a URL restriction for your domain, so a scraped
  token can't be used to burn your quota from somewhere else.
- Cloudflare → Security → enable **Bot Fight Mode** (free).
- Supabase → Authentication → Rate Limits → confirm the anonymous sign-in
  limit per IP is set to something reasonable.

## Data lifecycle

Game instances are meant to be ephemeral, not permanent records:

- **Host cancels a lobby** — a "Cancel lobby" button in the lobby screen (host-only, pre-start) deletes the `games` row immediately, cascading to its `teams`/`players`/instance-state rows. Other players' browsers notice via Realtime and get redirected home.
- **Players can export their photos first** — for `gps_photo`-verified games, a "Download photos" button (Turf War's `Board.tsx`) bundles every claim photo into a ZIP via the `download-game-photos` edge function, sized for saving straight from a phone before anything gets cleaned up.
- **Abandoned/stale games get swept automatically** — the `cleanup-games` edge function, triggered every 15 minutes by [`.github/workflows/cleanup-stale-games.yml`](.github/workflows/cleanup-stale-games.yml), deletes each stale game's Storage photos *and* its DB rows together: lobbies never started after 3 hours, finished (`completed`/`cancelled`) games 12 hours after ending (long enough to grab photos and see final standings), and any `active` game after 24 hours as a safety net in case a game type's own end-of-round logic didn't fire. `stale_game_ids()` (`supabase/migrations/0015_cleanup_games_edge.sql`) is the single source of truth for what counts as stale. A much-less-frequent `pg_cron` job (`cleanup_stale_games()`, every 6 hours) is a pure fallback in case the GitHub Actions trigger stops running — DB rows never grow unbounded either way, though in that fallback path photos can be orphaned if nobody downloaded them first. Requires a `CLEANUP_SECRET` set identically via `npx supabase secrets set CLEANUP_SECRET=...` and as a GitHub Actions repository secret (Settings → Secrets and variables → Actions) — it authenticates the workflow to the edge function, since there's no logged-in player driving this.

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
4. Deploy the edge functions (or let [`deploy-functions.yml`](.github/workflows/deploy-functions.yml) do it on push, once `SUPABASE_ACCESS_TOKEN` is set — see step 7):
   ```bash
   npx supabase functions deploy
   ```
5. Supabase free-tier projects pause after a week of inactivity — [`.github/workflows/keep-supabase-alive.yml`](.github/workflows/keep-supabase-alive.yml) pings the project daily via GitHub Actions to prevent that. Requires no setup beyond this repo being on GitHub with Actions enabled (the default).
6. Optional: connect the GitHub repo under **Project Settings → Integrations → GitHub**, and enable migration deploys so `supabase/migrations/*.sql` applies automatically on push to `main`. Skip the "branching" / preview-database option — that's a staging-environment feature aimed at teams, not needed here and can incur cost beyond the free allowance.
7. For edge functions to auto-deploy on push (see [Content](#content) above), generate a personal access token at [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) and add it as a GitHub repository secret named `SUPABASE_ACCESS_TOKEN` (Settings → Secrets and variables → Actions) — same one-time-setup pattern as `CLEANUP_SECRET` below.

### Cloudflare setup

Cloudflare has folded Pages into the unified Workers product for new
projects -- "Create a Worker" connected to a git repo now deploys via
`wrangler` reading [`wrangler.jsonc`](wrangler.jsonc) rather than a separate
"build output directory" field. This is a pure static-asset deploy (no
Worker script) -- all trusted logic lives in Supabase Edge Functions.

1. Push this repo to GitHub.
2. In the Cloudflare dashboard, create a Worker connected to the repo. Build command: `npm run build`. Deploy command (pre-filled): `npx wrangler deploy` — it reads `wrangler.jsonc`'s `assets.directory` (`./dist`) and serves it, falling back to `index.html` for client-side routes.
3. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_TURNSTILE_SITE_KEY` as build-time environment variables (same values as `.env.local`) — Vite inlines `VITE_*` vars at build time, so they must be available to the `npm run build` step, not just at runtime.
4. Attach your domain under the project's custom domains settings.
5. Cloudflare dashboard → **Turnstile** → Add site, using the same domain (add `localhost` too, so local dev works with the same key). Widget mode: **Managed**. Put the **Site Key** in `VITE_TURNSTILE_SITE_KEY` (both `.env.local` and the Worker's build variables above); set the **Secret Key** server-side only, via `npx supabase secrets set TURNSTILE_SECRET=...` — never in a `VITE_`-prefixed variable, or Vite would ship it straight to the browser.

## Project layout

```
content/                        git-sourced static content (challenges, game type name/description) -- see Content above
src/
  components/                   shared UI primitives (Button, Field, Layout)
  routes/                       generic lobby pages: Landing, CreateGame, Join, Lobby, Play
  games/<slug>/                 one folder per game (turf-war, lockout): Board, LobbySettings, register, api, types
  lib/supabaseClient.ts         Supabase client, safe to import even if unconfigured
  lib/gameRegistry.ts           game module registry (the extensibility seam)
  lib/map/RegionMap.tsx         shared Mapbox layer for spatial games
  types/database.ts             hand-maintained mirror of the generic lobby schema
  types/game.ts                 GameModule interface every game implements
supabase/
  migrations/                   generic lobby schema, then one migration set per game, in order applied
  functions/                    one folder per edge function (create-game, turf-war-start, lockout-claim-cell, ...)
```

## Games

- **Turf War** — complete challenges to claim SF neighborhoods; largest connected territory held by the end wins. Secret zones, discard/veto mechanics, optional GPS/photo verification.
- **Lockout** — two teams race to fill a shared NxN challenge board; win by bingo line, majority of cells, or (if time runs out) whichever tiebreak the host picked.
- **Hide and Seek** *(scaffold only)* — hide and seek across San Francisco. `src/games/hide-and-seek/` exists and is registered, but `Board`/`LobbySettings` are placeholder stubs and there's no DB schema or edge functions yet — see [Coming soon games](#coming-soon-games) below.
- **Territory Control** *(scaffold only)* — complete challenges to claim SF districts; most districts controlled by the end wins. Same placeholder state as Hide and Seek — `src/games/territory-control/` is scaffolded and registered, nothing implemented yet.

Both Turf War and Lockout are currently marked "Coming Soon!" too (paused, not permanently retired) — see the same section. All are built as `GameModule`s (see Architecture above) — adding a game means writing a new `src/games/<slug>/` folder, its own migrations/edge functions, and importing its `register` once in `src/App.tsx`. Nothing in the generic layer needs to change.

### Coming soon games

`src/lib/comingSoon.ts` lists slugs that show a "Coming Soon!" badge and are
disabled on the create page, independent of `game_types.is_active` (which
only controls whether a game appears on the landing page at all). Remove a
slug from that set once it's ready for real play.

To play coming-soon games locally without launching them, set
`VITE_UNLOCK_ALL_GAMES=true` in `.env.local`. Production doesn't set it, so
those games stay Coming Soon there.
