# Emberveil — Full Execution Plan & Spec

**Long-term goal**  
Emberveil is the Baldur’s Gate for Magic players.  
Rules small enough to learn in one evening. Systems familiar enough that mana, blockers, and combat math feel known. Leaders and their trees deep enough that returning to the same character still feels like a long conversation. The court remembers what you unlocked. The story remembers the choices.

This plan incorporates Commander-inspired mechanics (leader identity, multiplayer politics, returning threats, table reading) without copying the format’s constraints. It keeps fixed decks, short games, and clear language.

**AAA influences applied**
- Vertical slice gates (Tim Cain / industry standard): each phase ends with a playable, representative build of the new systems at target quality.
- Companion persistence and choice memory (Baldur’s Gate 3): leaders as long-term characters whose growth and story outcomes carry forward.
- Clarity as a feature (Slay the Spire intents): show the relevant state (threat, tree effects, leader cost) instead of hiding it.
- Iterative refinement (Supergiant / Hades): core loop stays stable; new content and systems are added only after the previous layer is understood and playable.

**Guardrails (unchanged)**
- No seventh mode.
- No daily quests.
- No shop that sells growth points.
- No full free deckbuilding.
- No 40-life / 100-card singleton rules.
- Games stay under ~20 minutes for 4 players.

---

## Phase 0 — Foundation (Current)

**Status**: Live on main. Vertical slice of the core loop is complete.

**What exists**
- 6 leaders with fixed decks, capability text, strategy text, and 2-branch ability trees.
- Growth points (+1 every 3 turns). Unlock action in `act()`.
- Modes: Free-for-all, Teams, Co-op vs Sentinels.
- Co-op story: “The Watch Beneath the Ash” (restore 3 Dawnward marks).
- Mana ramps to 10. One combat phase. Blocking + reactions.
- Leader summons with increasing cost (`leaderCasts`).
- Lobby shows capability + strategy. In-game tree panel.
- Opening-hand redraw, turn timers, batch combat.

**Commander parallels already present**
- Leader as persistent identity.
- Rising summon cost (commander-tax analog).
- Multiplayer free-for-all and team modes.
- Fixed “color identity” via pre-built decks + trees.

**Gaps for later phases**
- Not all tree nodes have mechanical effects.
- Limited tools for table reading or temporary alliances.
- No persistence of growth/trees across matches.
- Story is one chapter.

**Phase 0 exit criteria (already met)**  
A full match can be played in all modes. Leaders feel distinct. Core loop is stable.

---

## Phase 1 — Clarity & Completeness  
**Timeline**: 4–6 weeks  
**Goal**: A Magic player can sit down, understand a leader in 30 seconds, and still be surprised on turn 6. Every tree node does something.  
**Vertical slice**: One complete match with all tree nodes functional, new rules page visible, and two new leaders playable.

### Detailed Deliverables

1. **Full tree implementation**
   - Every node in `trees` produces a mechanical effect.
   - Effects are flag- or counter-based and checked in existing functions (`resolveCombat`, `declareAttack`, `beginTurn`, card play).
   - No new keywords that require a glossary. Use the same short language as capability text.
   - Examples of required effects (from current tree definitions):
     - Rider: first attack each turn +1 power; Ash Surge also grants Rush; attack with 3+ creatures → draw.
     - Ash: Scouts cost 0 if you played a creature last turn; Wildfire deals 4; summoning Tala deals 2 to opponent.
     - Wall: first blocker +2 HP; Dawnward heals 6; when you block, attacker takes 1.
     - Shelter: Silver Veil prevents 4; start of turn with no creatures → +2 life; summoning Vael heals 3.
     - Flame: Wildfire deals 4; play a damage spell → draw; reactions cost 1 less.
     - Weave: may play one reaction as an instant on your turn; Ash Surge also draws; summoning Neri looks at top 2 and keeps one.
     - Briar: Briar Gathering summons 3; sprites +1 power; when a sprite dies, summon another.
     - Thorn: creatures have Guard; attack with 4+ → all +1 power; summoning Sylva freezes a target.
     - Forge: Foundry Crystal gives +2 max mana; Ember Drakes cost 1 less; play a 5+ cost creature → draw.
     - Titan: Orrun has Rush when summoned; creatures +1 HP; summoning Orrun deals 3 to all opposing creatures.
     - Tide: Tidebind freezes through two turns; freeze a creature → draw; frozen creatures take 1 at start of their turn.
     - Oracle: start of turn scry 1; Silver Veil also draws; summoning Iskar draws two.
   - Spec: Extend player/unit state with the minimal flags needed (`firstAttackDone`, `firstBlockDone`, etc.). Document each effect next to its node text.

2. **In-game rules page**
   - Static panel using the same language as leader capability/strategy text.
   - Sections: Mana (ramps to 10), Combat (one attack phase, blocking, reactions), Leaders (summon cost rises with each cast), Trees (growth every 3 turns, choose one branch).
   - A Magic player should recognize the pieces and immediately see what is different.
   - Spec: Accessible from lobby and from an in-match help button. No external glossary.

3. **Two new leaders**
   - One who never left the outer court (defensive / table-reading lean).
   - One who arrived after the eclipse and claims no house (flexible midrange).
   - Each ships with: capability text, strategy text, fixed deck, and 2-branch tree.
   - Spec: Extend `leaders` and `trees` objects. Update lobby `describe()` and tree panel. New leaders must be playable in all modes on day one.

4. **Spectator mode**
   - Finished matches can be watched (read-only).
   - Spec: Persist final game state. Client renders it without input. Simple timeline scrub optional for later.

**Exit criteria (vertical slice)**
- All existing tree nodes produce visible, documented effects.
- A new player can open the rules page and complete a match without external docs.
- Two new leaders are selectable and functional in FFA, Teams, and Co-op.
- Playtests confirm a Magic player can state a leader’s plan after one game.

---

## Phase 2 — Table Reading & Multiplayer Feel  
**Timeline**: 6–10 weeks after Phase 1  
**Goal**: Bring Commander’s politics and threat assessment into Emberveil’s shorter games without adding a seventh mode.  
**Vertical slice**: A 4-player Teams match in which at least one truce is proposed and the shared objective is contested, with threat state clearly visible.

### Detailed Deliverables

1. **Threat and table state**
   - Visible “current threat” indicator (highest life lead, most creatures on board, or last to eliminate a player).
   - Spec: Server calculates each turn. Client shows a simple icon or colored border on the player frame. No chat required to understand who is ahead.

2. **Temporary alliances (Teams mode first)**
   - Players can propose a one-turn “truece” (cannot attack each other this turn).
   - Spec: New action types `proposeTruce` / `acceptTruce`. Stored on game state for the current round. Cleared at end of round. Visible to the whole table.

3. **Shared objective in Teams**
   - One contestable objective (e.g., control a “key” token that both houses can claim).
   - Spec: New game object `objective`. Players spend an action to contest it. First team to 3 contests claims it. Claiming grants a small, readable bonus (e.g., +1 max mana next turn or a free reaction). The Accord can still be broken on purpose.

4. **Leader damage tracking (optional alternate win)**
   - Track combat damage dealt by each leader unit.
   - If a single leader deals 12+ combat damage to one player, that player is eliminated (scaled for 20 life).
   - Spec: Add `leaderDamage: {}` map on each player. Increment in `resolveCombat` when the attacking unit is the leader. Check after damage. Toggleable in room settings. Off by default for ranked.

5. **Private table mode**
   - Two players can queue the same leader against each other.
   - Spec: Lobby filter or checkbox. No balance changes required.

**Exit criteria (vertical slice)**
- Teams matches regularly contain at least one truce proposal or objective contest.
- Players can identify the current threat without asking.
- Leader-damage win condition is optional and does not dominate default play.
- Average 4-player game length remains under 20 minutes.

---

## Phase 3 — Persistence & Story Continuity  
**Timeline**: 10–16 weeks after Phase 2  
**Goal**: The companion relationship. Returning to the same leader feels like continuing a conversation. The story remembers choices.  
**Vertical slice**: A player finishes a Co-op chapter, returns later with the same leader, sees their unlocked nodes, and the next chapter’s intro reflects the previous outcome.

### Detailed Deliverables

1. **Cross-match growth (optional)**
   - Player can choose to keep unlocked nodes and growth for a leader across matches.
   - Spec: Store in D1 under a player key or local storage. On join, offer “continue with Tala (2 nodes unlocked)”. Default remains per-match for ranked. No shop or paid acceleration.

2. **Seasonal chapters**
   - Second co-op chapter: the doors open a crack; the people inside are no longer only sleeping; the Sentinels begin to argue with each other.
   - Spec: New story object in `lore`. New win/lose conditions that reuse the existing ward-mark system where possible. Intro text references Phase 0 chapter.

3. **Choice memory**
   - Co-op outcomes can branch (restore the ward and still fail the people; defeat the Sentinels and leave the doors sealed).
   - Spec: Store last co-op outcome per player. Next chapter reads it and adjusts intro text and starting conditions. The story remembers without requiring a full narrative engine.

4. **Third house teaser**
   - Neri’s tree or a new card references a house written out of the records.
   - Spec: Flavor text + one mechanical nod (e.g., Neri can look at an opponent’s hand once per match). No new mode.

**Exit criteria (vertical slice)**
- Players can resume a leader with progress.
- Second co-op chapter is playable and references prior outcomes.
- Story text changes based on previous choices.
- Persistence is optional and does not affect ranked fairness.

---

## Phase 4 — Controlled Expansion  
**Timeline**: Ongoing after Phase 3  
**Goal**: Add content without losing the “small rules, long conversation” identity.  
**Vertical slice**: One new supporting card and one new leader portrait fully integrated and explainable in existing language.

### Detailed Deliverables

1. **New cards that support existing trees**
   - Tidebind variants, sacrificial Briar, Foundry cards that do more than ramp.
   - Spec: Every new card must be explainable in the same short language as current capability text. No new keywords. Must be playable in at least one existing leader’s deck.

2. **Ranked limited to known leaders**
   - Ranked FFA uses only the original 6 + the 2 from Phase 1 until new cards are understood.
   - Spec: Room setting or separate queue. New content is available in unranked and private tables first.

3. **Art completion**
   - Finish card art and leader portraits for every existing card before commissioning new art.
   - Spec: Track in a simple checklist. Prioritize cards that appear in multiple decks.

**Exit criteria**
- New content is additive, not replacing.
- Ranked remains stable.
- Art pipeline is complete for current cards before expansion.

---

## Technical Spec Notes (Cross-Phase)

**Data model extensions**
- Player: `growth`, `tree`, `unlocked`, `leaderDamage` (Phase 2), `persistentNodes` (Phase 3).
- Game: `objective` (Phase 2), `storyOutcome` (Phase 3), `truce` (Phase 2).
- All stored in existing D1 match state or a lightweight player table. No new services required.

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
- Clarity is non-negotiable: if a Magic player cannot read the state, the feature is not done.

**Success metrics**
- A Magic player can explain a leader’s plan after one game.
- Players return to the same leader across sessions.
- Teams and Co-op matches contain at least one meaningful non-combat decision (truce, objective, or story choice).
- Average session length stays within the target window.

---

The citadel does not expand quickly. This plan expands it only where the court already knows the names, and only after the previous layer is playable and understood.
