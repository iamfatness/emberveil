# Emberveil — Agent Handoff

**Repo**: https://github.com/iamfatness/emberveil  
**Branch**: main  
**Goal**: Execute the long-term plan so Emberveil becomes the Baldur’s Gate for Magic players — small rules, familiar combat/mana, deep leader identity via trees, multiplayer politics, and story that remembers choices.

## Required Reading (in order)

1. `FULL_EXECUTION_PLAN.md` — primary execution document. Follow its phases and vertical-slice exit criteria.
2. `EXECUTION_PLAN.md` — shorter companion plan.
3. `ROADMAP.md` — high-level direction and guardrails.
4. `LORE.md` — voice and setting. Keep all new flavor text in this voice.
5. `src/game.mjs` — core rules, leaders, trees, combat, `act()`, `player()`.
6. `public/app.js` — lobby and in-game UI (leader describe, tree panel).
7. `public/style.css` — existing styles; extend rather than replace.

## Current State (Phase 0 complete)

- 6 leaders with fixed decks, capability/strategy text, and 2-branch ability trees.
- Growth points (+1 every 3 turns) and unlock action.
- Modes: FFA, Teams, Co-op vs Sentinels.
- Rising leader summon cost (`leaderCasts`).
- Mana to 10, one combat phase, blocking + reactions.
- Cloudflare Workers + D1 backend. Local: `npm start` → `http://localhost:3000`.
- Some tree node effects are already partially implemented in `src/game.mjs`. Finish the rest before adding new systems.

## Guardrails (do not violate)

- No seventh mode.
- No daily quests.
- No shop that sells growth points.
- No full free deckbuilding.
- No 40-life / 100-card singleton rules.
- Keep 4-player games under ~20 minutes.
- No new keywords that need a glossary. Use the same short language as existing capability text.
- Every new feature must be readable by a Magic player without external docs.
- Commit to main only after the phase’s vertical-slice exit criteria are met.

## Execution Order

Execute phases in order. Do not start a later phase until the previous phase’s exit criteria are met and the build is playable.

### Phase 1 — Clarity & Completeness (start here)

**Vertical slice**: One complete match with all tree nodes functional, rules page visible, two new leaders playable.

1. **Finish all tree effects** in `src/game.mjs`.
   - Every node listed in `FULL_EXECUTION_PLAN.md` Phase 1 must produce a visible mechanical effect.
   - Use flags/counters on player or unit state (`firstAttackDone`, `firstBlockDone`, etc.).
   - Check them in existing functions: `resolveCombat`, `declareAttack`, `beginTurn`, card play paths.
   - Document each effect next to its node text in the trees object or a short comment.

2. **In-game rules page**.
   - Add a static panel (lobby + in-match help) using the same language as leader capability text.
   - Sections: Mana, Combat, Leaders, Trees.
   - Files: `public/index.html`, `public/app.js`, `public/style.css`.

3. **Two new leaders**.
   - One defensive / table-reading lean (never left the outer court).
   - One flexible midrange (arrived after the eclipse, claims no house).
   - Each needs: capability, strategy, fixed deck, 2-branch tree.
   - Extend `leaders` and `trees` in `src/game.mjs`. Update lobby `describe()` and tree panel in `public/app.js`.
   - Must work in all modes on day one.

4. **Spectator mode** (can be minimal).
   - Persist final game state. Read-only view.
   - Can be deferred if it blocks the tree and rules work; note it as follow-up.

**Phase 1 done when**:
- All tree nodes have effects.
- Rules page is reachable and sufficient for a new player.
- Two new leaders are selectable and functional.
- A Magic player can state a leader’s plan after one game.

### Phase 2 — Table Reading & Multiplayer Feel

**Vertical slice**: 4-player Teams match with at least one truce and one objective contest; threat state visible.

1. Threat indicator (server-calculated, client-shown icon/border).
2. Temporary one-turn truce in Teams (`proposeTruce` / `acceptTruce`).
3. Shared contestable objective in Teams.
4. Optional leader-damage elimination (12+ from a single leader unit; toggleable, off by default for ranked).
5. Private table mode (same leader allowed).

Touch: `src/game.mjs` (new actions and state), `public/app.js` + `public/style.css` (UI).

**Phase 2 done when**:
- Threat is readable without chat.
- Truce and objective appear in normal Teams play.
- Game length stays under 20 minutes.
- Leader-damage win is optional and non-dominant.

### Phase 3 — Persistence & Story Continuity

**Vertical slice**: Player finishes a Co-op chapter, returns with the same leader, sees unlocked nodes, and the next chapter’s intro reflects the prior outcome.

1. Optional cross-match growth (D1 or local storage; ranked stays per-match).
2. Second co-op chapter (doors open a crack; Sentinels argue). Reuse ward-mark system.
3. Choice memory (store last co-op outcome; next chapter reads it).
4. Third-house teaser (flavor + one small mechanical nod on Neri).

Touch: `src/game.mjs` (lore object, story outcome), D1 schema if needed (`cloudflare/migrations/`), `public/app.js`.

**Phase 3 done when**:
- Persistence is optional and does not affect ranked.
- Second chapter is playable and references prior outcomes.
- Story text changes based on choices.

### Phase 4 — Controlled Expansion

Only after Phase 3 is live and understood.

- New cards that support existing trees only (no new keywords).
- Ranked limited to known leaders until new content is understood.
- Finish art for existing cards before new art.

## Technical Notes

- Core logic lives in `src/game.mjs`. Prefer data-driven effects (flags on player/unit) over new subsystems.
- UI is vanilla JS in `public/app.js`. Keep the existing lobby and tree panel patterns.
- Backend is Cloudflare Workers + D1. Match state is already persisted. Add player-level persistence only when required (Phase 3).
- Local development: Node 22.13+, `npm start`.
- Deploy: see README.md (Wrangler 4 + D1).
- Commit messages should reference the phase (e.g., “Phase 1: implement remaining tree node effects”).

## Voice & Flavor

All new leader text, story intros, and rules language must match `LORE.md` and the existing capability/strategy strings: sparse, concrete, focused on memory, duty, ash, gates, and the citadel. No marketing language.

## Success Definition

A Magic player can sit down, understand a leader in 30 seconds, be surprised on turn 6, make a meaningful non-combat decision in a multiplayer game, and want to return to the same leader later. The court remembers what was unlocked. The story remembers the choices.

Start with Phase 1. Do not skip ahead.
