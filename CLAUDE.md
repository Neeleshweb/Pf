# What this is

PM Gut Check is a web app where product managers make a "call" on a PM dilemma, commit their answer before seeing the crowd, then see how a room of peers + curated answers compare. It tracks personal calibration and a "judgment fingerprint" over time. It's part of a personal site (home + portfolio + PM toolkit + the game).


Production: https://neeleshpmtoolkit.com (currently served by GitHub Pages).
New host (migrating): Cloudflare Pages — https://pm-gut-check.pages.dev.
Owner: Neelesh Singh (Technical PM).


# Architecture


Frontend: static HTML/CSS/JS, no build step. Key files at repo root: index.html, portfolio.html, toolkit.html, gutcheck.html (the game — one large inline <script>), gc-auth.js (shared auth helper). Assets in /img, /css, /js, /lib, /products.
Backend: Supabase (Postgres + PostgREST + Auth + pg_cron). Auth = Google OAuth.

Production project ref: oxxzygbfgmlnvavjmhct. Anon key lives in the page code (public by design — that's expected).
A separate staging Supabase project exists for testing DB changes; the frontend picks prod vs staging via a hostname-based config.



All server logic is in SECURITY DEFINER Postgres functions (RPCs) prefixed gc_ (e.g. gc_feed_v2, gc_archive_v2, gc_submit_dilemma, gc_room_sp, gc_notif_*). Triggers on gc_votes / gc_dilemma_likes / gc_reason_reactions / gc_schedule. Cron via pg_cron (gc_run_daily, gc_run_notifications).
Tables (public schema): gc_schedule, gc_votes, gc_submissions, gc_profiles, gc_dilemma_likes, gc_reason_reactions, gc_notifications, gc_subscribers.


# THE SACRED FLOW — never break

The voting → reveal pipeline in gutcheck.html is the heart of the product and must never regress:
selectOption → checkReady → commit → openAud → doCommit → reveal → recordVote.
Commit-before-reveal is the core mechanic: never expose any crowd/room data before the user has committed their own call.

# Working rules (strict)


Surgical, minimal edits only. Do not refactor or "tidy" unrelated code.
Never break existing functionality. Preserve behavior exactly unless a change is explicitly requested.
Validate before declaring done: extract the inline <script> from gutcheck.html and run node --check; check <div>/<section> open-vs-close balance; confirm any find-and-replace target is unique.
All DB schema changes are tested on the staging Supabase project first, then production.
Don't invent content, metrics, or copy. Ask if unsure.
Keep secrets out of git (.env is gitignored). Public anon keys in client code are fine.


# Deploy & git workflow


Cloudflare Pages auto-deploys: pushing master → production; pushing any other branch → a preview/staging deploy.
Default working branch is staging. Make changes there, push, test on the preview URL, then merge to master only when the owner explicitly says so.
When the owner asks you to commit/push, run the git commands yourself (git add / commit / push) with a clear, descriptive message. Default target = staging. Never force-push. Never push to master without explicit confirmation. After pushing, tell the owner the branch + which preview URL to check.


# Current initiative

Making every feature scalable to ~100k users across 8 phases (foundations → voting integrity → denormalized stats → pagination → notifications → profile → moderation → load test). Build code that scales to Supabase Pro, but stay on free tiers until post-launch traction.
