# Emberveil — Execution Plan & Spec

**Long-term goal**  
Emberveil is the Baldur’s Gate for Magic players.  
Rules small enough to learn in one evening. Systems familiar enough that mana, blockers, and combat math feel known. Leaders and their trees deep enough that returning to the same character still feels like a long conversation. The court remembers what you unlocked. The story remembers the choices.

This plan incorporates Commander-inspired mechanics (leader identity, multiplayer politics, returning threats, table reading) without copying the format’s constraints. It keeps fixed decks, short games, and clear language.

---

## Phase 0 — Foundation (Current)

**Status**: Live on main.

**What exists**
- 6 leaders with fixed decks, capability text, strategy text, and 2-branch ability trees.
- Growth points (+1 every 3 turns). Unlock action in `act()`.
- Modes: Free-for-all, Teams, Co-op vs Sentinels.
- Co-op story: “The Watch Beneath the Ash” (restore 3 Dawnward marks).
- Mana ramps to 10. One combat phase. Blocking + reactions.
- Leader summons with increasing cost (`leaderCasts`).
- Lobby shows capability + strategy. In-game tree panel.

**Commander parallels already present**
- Leader as persistent identity (like a commander).
- Rising summon cost (analogous to commander tax).
- Multiplayer free-for-all and team modes.
- Fixed “color identity” via pre-built decks + trees.

**Gaps**
- Not all tree nodes have mechanical effects implemented.
- Limited tools for table reading or temporary alliances.
- No persistence of growth/trees across matches.
- Story is one chapter.

---

## Phase 1 — Clarity & Completeness  
**Timeline**: Next 4–6 weeks  
**Goal**: A Magic player can sit down, understand a leader in 30 seconds, and still be surprised on turn 6. Every tree node does something.

### Deliverables

1. **Full tree implementation**
   - Every node in `trees` has a mechanical effect in combat, play, or beginTurn.
   - Examples already sketched: first-attack +1 power (rider), sprites +1 power (briar), freeze lasts 2 turns (tide), etc.
   - Spec: Add flags or counters on player/unit state. Check them in `resolveCombat`, `declareAttack`, `beginTurn`, and card play functions. No new keywords that require a glossary.

2. **Rules page in-game**
   - Short page using the same language as leader capability/strategy text.
   - Sections: Mana, Combat (one attack, blocking, reactions), Leaders (summon cost rises), Trees (growth every 3 turns).
   - Magic player should recognize the pieces immediately and see what is different.
   - Spec: Static HTML/JS panel. Link from lobby and how-to-play.

3. **Two new leaders**
   - One who never left the outer court (defensive/politics lean).
   - One who arrived after the eclipse and claims no house (flexible midrange).
   - Each with capability, strategy, deck, and 2-branch tree.
   - Spec: Extend `leaders` and `trees` objects. Update lobby `describe()`.

4. **Spectator mode**
   - Finished matches can be watched.
   - Spec: Store final game state. Read-only replay view.

**Exit criteria**
- All existing tree nodes produce visible effects.
- A new player can open the rules page and play a full match without external docs.
- Two new leaders playable in all modes.

---

## Phase 2 — Table Reading & Multiplayer Feel  
**Timeline**: 6–10 weeks after Phase 1  
**Goal**: Bring Commander’s politics and threat assessment into Emberveil’s shorter games without adding a seventh mode.

### Deliverables

1. **Threat and table state**
   - Visible “current threat” indicator (highest life lead, most creatures, or last to eliminate someone).
   - Spec: Calculate on server each turn. Show on client as a simple icon or border on the player frame.

2. **Temporary alliances (Teams mode first)**
   - Players can propose a one-turn “truece” (cannot attack each other this turn).
   - Spec: New action type `proposeTruce` / `acceptTruce`. Stored on game state for the current round. Cleared at end of round.

3. **Shared objective in Teams**
   - One contestable objective (e.g., control a “key” token that both houses can claim).
   - Spec: New game object `objective`. Players can spend an action to contest it. First to 3 contests claims it for their team.

4. **Leader damage tracking (optional alternate win)**
   - Track combat damage dealt by each leader (the summoned leader unit).
   - If a single leader deals 12+ combat damage to one player, that player is eliminated (scaled for 20 life).
   - Spec: Add `leaderDamage: {}` map on each player. Increment in `resolveCombat` when the attacking unit is the leader. Check after damage.

5. **Private table mode**
   - Two players can queue the same leader against each other.
   - Spec: Lobby filter or checkbox. No balance changes required.

**Exit criteria**
- Teams matches regularly feature at least one truce or objective contest.
- Players report that “who is the threat” is readable without chat.
- Leader damage win condition is optional and toggleable in room settings.

---

## Phase 3 — Persistence & Story Continuity  
**Timeline**: 10–16 weeks after Phase 2  
**Goal**: The companion relationship. Returning to the same leader feels like continuing a conversation. The story remembers choices.

### Deliverables

1. **Cross-match growth (optional)**
   - Player can choose to keep unlocked nodes and growth for a leader across matches.
   - Spec: Store in D1 under player account or local storage key. On join, offer “continue with Tala (2 nodes unlocked)”.
   - Default remains per-match for ranked.

2. **Seasonal chapters**
   - Second co-op chapter: doors open a crack; people inside are no longer only sleeping; Sentinels begin to argue.
   - Spec: New story object in `lore`. New win/lose conditions. Reuse existing ward marks system where possible.

3. **Choice memory**
   - Co-op outcomes can branch (restore the ward and still fail the people; defeat Sentinels and leave doors sealed).
   - Spec: Store last co-op outcome per player. Next chapter reads it and adjusts intro text and starting conditions.

4. **Third house teaser**
   - Neri’s tree or a new card references a house written out of the records.
   - Spec: Flavor text + one mechanical nod (e.g., Neri can look at an opponent’s hand once per match).

**Exit criteria**
- Players can resume a leader with progress.
- Second co-op chapter is playable and references prior outcomes.
- Story text changes based on previous choices.

---

## Phase 4 — Controlled Expansion  
**Timeline**: Ongoing after Phase 3  
**Goal**: Add content without losing the “small rules, long conversation” identity.

### Deliverables

1. **New cards that support existing trees**
   - Tidebind variants, sacrificial Briar, Foundry cards that do more than ramp.
   - Spec: Every new card must be explainable in the same short language as current capability text. No new keywords.

2. **Ranked limited to known leaders**
   - Ranked FFA uses only the original 6 + the 2 from Phase 1 until new cards are understood.
   - Spec: Room setting or separate queue.

3. **Art completion**
   - Finish card art and leader portraits for every existing card before commissioning new art.
   - Spec: Track in a simple checklist. Prioritize cards that appear in multiple decks.

### Guardrails (what is not planned)
- No seventh mode.
- No daily quests.
- No shop that sells growth points.
- No full free deckbuilding.
- No 40-life / 100-card singleton rules.

---

## Technical Spec Notes (Cross-Phase)

**Data model extensions**
- Player: `growth`, `tree`, `unlocked`, `leaderDamage` (Phase 2), `persistentNodes` (Phase 3).
- Game: `objective` (Phase 2), `storyOutcome` (Phase 3).
- All stored in existing D1 match state or player table.

**Implementation order**
1. Finish mechanical effects for current trees (Phase 1).
2. Add threat indicator and truce (Phase 2) — lowest risk, highest multiplayer feel.
3. Persistence (Phase 3) after the trees are stable.
4. New leaders and cards only after the above are live and understood.

**Balance principles**
- Keep games under 20 minutes for 4 players.
- Leader summon cost still rises.
- Trees provide specialization, not raw power that invalidates the base deck.
- Multiplayer tools (truce, objective) are optional and readable.

**Success metrics**
- A Magic player can explain a leader’s plan after one game.
- Players return to the same leader across sessions.
- Teams and Co-op matches contain at least one meaningful non-combat decision (truce, objective, or story choice).

---

The citadel does not expand quickly. This plan expands it only where the court already knows the names.
