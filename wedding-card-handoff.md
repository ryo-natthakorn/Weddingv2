# Handoff: Wedding E-Card Polish (Pantika & Natthakorn)

## Project
`c:\Users\Computer RC Herbal\Desktop\Weddingv2` — React/Vite mobile-first (414px) wedding e-card.
Branch: `refine/full-card-polish` (PR #2, open, not merged to `main`).
Vercel project `ryo-panyee-wedding/weddingv2`, production branch = `main`.

Read before continuing: `PRODUCT.md`, `DESIGN.md` (repo root) — design principles, palette,
named rules (Printed-Card Rule, Two-Voices Rule). `CLAUDE.md` — original build brief/batches.

## What happened this session
A long iterative polish pass, entirely on `refine/full-card-polish`, each round committed and
pushed directly (per standing user instruction — never create new branches). See commit log on
that branch for the full sequence; recent messages (newest first) summarize each round:
`git log --oneline refine/full-card-polish` — commits from `398a765` (color-revert +
spacing-compress) through `8d6da00` (QR drop-in + gallery photo bug fix + real photos added).

## Key decisions (not otherwise recorded anywhere)
- A full round of sage/blush color accents (leaf flourishes, alternating icon tints, burst
  particles) was added, then **explicitly reverted** per user feedback ("revert all color
  changes"). Do not reintroduce sage/blush without asking first — it was tried and rejected once.
- Photos, the venue image, and the PromptPay QR now use `import.meta.glob` drop-in patterns
  (client drops a file into a named `src/imports/...` path, no code change needed), matching a
  pre-existing pattern for Program icons. See `GallerySection.tsx`, `WeddingInvitation.tsx`
  (`VENUE_IMAGE_MODULES`), `GiftSection.tsx` (`QR_IMAGE_MODULES`).
- Parent/bride/groom name lines use `whiteSpace: nowrap` + `overflow: hidden` +
  `textOverflow: ellipsis` as a single-line guard, with line-height raised to 1.5–1.6
  specifically so Thai combining vowel marks and descenders (สระอือ, สระอุ, ฐ) aren't clipped.
- Parents' names are stacked full-width (not 2 columns) — 2 columns were too narrow for the
  longer Thai strings at the font size the client requested; this was already tried and caused
  visible text truncation before being fixed.

## Open work / not yet done
- Two gallery photos are large: `src/imports/memories/04-Vientiene.png` (**19.8MB**) and a few
  others in the 900KB–1MB range. User was asked, explicitly said leave uncompressed for now —
  revisit if mobile load time becomes a complaint.
- `src/imports/promptpay-qr.{png,jpg,jpeg,webp}` does not exist yet — Gift section still shows
  the dummy QR placeholder. Code is ready; just needs the client to drop the real file in.
- A `.env` file was committed directly to this branch via GitHub's web UI (bypasses
  `.gitignore`). User declined cleanup — it's redundant (Vercel's dashboard env var is what
  production actually uses) but sits in this branch's git history. **Redacted here**: do not
  print or re-derive the actual `VITE_GOOGLE_SCRIPT_URL` value in any future output — treat it
  as already configured correctly (confirmed working via a live test RSVP submission that wrote
  a row to the Google Sheet).
- Branch not merged to `main`; PR #2 still open.

## Traps to avoid
- **Path-depth bug already shipped once**: `import.meta.glob` calls in files under
  `src/app/components/wedding/` need `"../../../imports/..."` (3 levels up to `src/`). Files
  directly under `src/app/components/` need only `"../../imports/..."`. Mixing these up fails
  **silently** — zero matches, no build error — which is exactly what happened to the Gallery
  photos before being caught and fixed in commit `8d6da00`.
- RSVP submission uses `mode: "no-cors"` — the client can never detect an actual write failure.
  Already confirmed working end-to-end, but keep in mind if a future report says "guest saw
  thank-you but no row appeared."
- Untracked and intentionally left alone all session, do not assume they need cleanup without
  asking: `.claude/`, `.impeccable/critique/`, `src/imports/Ring.png`.

## Suggested skills for the next session
- **impeccable:impeccable** — this entire polish thread was driven by this skill (`/impeccable
  critique`, `/impeccable polish`, plan-mode design work). Re-invoke it for any further visual
  polish, a fresh critique pass, or before making other design-affecting changes — it already has
  this project's `PRODUCT.md`/`DESIGN.md` context wired up (`.impeccable/design.json`,
  `.impeccable/critique/` history).
- **run** — to actually launch the dev server and view changes in a browser before claiming a
  visual fix works; no browser automation was available this session, so nothing shown here has
  been visually confirmed, only verified via build success + computed contrast math.
- **security-review** — if touching the RSVP/Apps-Script integration further (e.g. adding
  fields, changing the no-cors handling), given it's the one part of the site that writes to an
  external system.

## Prompt for new chat
Continuing work on the Pantika & Natthakorn wedding e-card, branch `refine/full-card-polish`.
Treat this document as context to verify against the live repo, not as facts to assume — file
contents may have changed since this was written. Ask before restarting work if anything's
unclear.
