# Challenge 2 Survive - Gameplay Implementation Guide

## Overview

This document explains how to implement the **Challenge 2 Survive** game script (`challenge2survive_game.json`) in a text-based game engine. The game is a branching narrative reality TV competition where player choices affect relationships, alliances, and ultimately determine victory or elimination.

---

## Core Concepts

### Game State

Maintain a **game state object** that tracks the player's journey. Initialize it from `game_state_template` in the JSON:

```
{
  current_node: "intro_001",
  player_name: "",           // Prompt player at start
  day: 1,
  episode: 1,
  relationships: {...},      // NPC relationship scores (-100 to 100)
  alliances: [],             // Active alliance IDs
  flags: {},                 // Story branch triggers
  eliminated_players: [],    // Who's been sent home
  challenge_wins: 0,
  elimination_wins: 0,
  vote_history: []
}
```

---

## Node Types & How to Render Them

### 1. NARRATIVE Nodes

**What they are:** Pure story text. No player input required.

**How to render:**
1. Display the `text` field
2. If `speaker` is present, format as dialogue: `[CHARACTER_NAME]: "text"`
3. Show a "Continue" button or prompt
4. On continue, advance to the `next` node

**Example display:**
```
════════════════════════════════════════════════════
DAY 2 - FIRST CHALLENGE

You wake up to Deej's voice BLASTING through the villa's 
speaker system...
════════════════════════════════════════════════════

[Press ENTER to continue]
```

---

### 2. CHOICE Nodes

**What they are:** Player decision points. These shape the story.

**How to render:**
1. Display the `text` field (context/setup)
2. Display numbered choices from the `choices` array
3. Wait for player input (1, 2, 3, etc.)
4. Display the chosen option's `response_text`
5. Apply the `effects` (see Effects section below)
6. Advance to the choice's `next` node

**Example display:**
```
════════════════════════════════════════════════════
Jake points directly at you. "I want you on the winning 
team. What do you say? Alpha alliance. We run this house."

The room has gone quiet. Everyone's watching.
════════════════════════════════════════════════════

What do you do?

  [1] Accept publicly - commit to the alphas
  [2] Deflect with humor - don't commit  
  [3] Decline directly - assert independence

> _
```

---

### 3. BRANCH Nodes

**What they are:** Automatic routing based on game state. Player doesn't see these.

**How to handle:**
1. Evaluate the `condition` object
2. Route to appropriate node based on result
3. Don't display anything—just route

**Condition types:**
- `flag_check`: Does a specific flag exist/have a value?
- `relationship_check`: Is relationship with character above/below threshold?
- `alliance_check`: Is player in a specific alliance?

---

### 4. ENDING Nodes

**What they are:** Game over states (win, lose, various eliminations)

**How to render:**
1. Display the full `text` field
2. Replace placeholder variables with actual stats:
   - `[CHALLENGE_WINS]` → `game_state.challenge_wins`
   - `[ELIMINATION_WINS]` → `game_state.elimination_wins`
3. Show "GAME OVER" or "Play Again?" prompt
4. Optionally save stats/achievements

---

## Applying Effects

When a choice is made, apply its `effects` object:

### Relationship Changes
```json
"relationships": {"jake": -25, "maya": 15}
```
**Action:** Add values to `game_state.relationships[character]`. Clamp to -100/+100.

### Flag Setting
```json
"flags": {"jake_rejected": true, "intro_style": "confident"}
```
**Action:** Set `game_state.flags[key] = value`

### Alliance Changes
```json
"alliances": ["alpha_pack"]
```
**Action:** Add alliance ID to `game_state.alliances[]`

### Challenge Results
```json
"challenge_wins": 1
```
**Action:** Increment `game_state.challenge_wins`

---

## Relationship System

Relationships determine NPC behavior, dialogue variations, and voting patterns.

| Score Range | Status | Behavior |
|-------------|--------|----------|
| 50 to 100 | Ally | Votes with you, shares info |
| 25 to 49 | Friend | Generally supportive |
| -24 to 24 | Neutral | Unpredictable |
| -49 to -25 | Rival | Works against you |
| -100 to -50 | Enemy | Actively targets you |

**Usage:**
- Check relationships when determining NPC votes
- Use for conditional dialogue (friendly vs hostile)
- Factor into elimination outcomes

---

## Voting System

During voting phases:

1. **Player votes first** - Display voting choice node
2. **Calculate NPC votes** using this formula per NPC:

```
vote_target_score = 
  (relationship_with_target × -0.3) +
  (is_alliance_enemy ? 30 : 0) +
  (threat_assessment × 20) +
  (random_factor × 10)
```

3. **NPCs vote for the player with highest score** (most likely target)
4. **Display vote results** showing who voted for whom
5. **Determine elimination matchup** based on totals

**Example vote display:**
```
════════════════════════════════════════════════════
THE VOTES ARE IN

Jake voted for... TYLER
Maya voted for... BRITTANY
Darius voted for... BRITTANY
Elena voted for... BRITTANY
Tyler voted for... JAKE
Marcus voted for... BRITTANY
You voted for... BRITTANY

BRITTANY receives 5 votes.
JAKE receives 1 vote.
TYLER receives 1 vote.

BRITTANY and JAKE will face elimination.
════════════════════════════════════════════════════
```

---

## Challenge System

Challenges are represented as choice sequences. The player's decisions during challenges affect:

1. **Position/Placement** - Tracked via flags like `challenge_position`
2. **Risk vs Reward** - Risky choices have variable outcomes based on earlier choices
3. **Winner determination** - Final placement affects who has power

**Rendering challenge nodes:**
- Use dramatic pacing (short pauses between reveals)
- Display intermediate standings when appropriate
- Build tension with descriptions

---

## Eliminations

When a player faces elimination:

1. **Display the elimination format** (from host dialogue)
2. **Present strategy choices** to player
3. **Calculate outcome** based on:
   - Strategy choice modifier
   - Opponent strength (from NPC profile)
   - Format type (physical vs mental vs hybrid)
   - Desperation bonus (if player has survived multiple eliminations)

**Win probability base: 50%**, modified by factors above.

**If player loses:** Route to appropriate `ending_eliminated` node.
**If player wins:** Continue game, update `elimination_wins`.

---

## Text Replacement Variables

Replace these placeholders when rendering:

| Variable | Replace With |
|----------|--------------|
| `[PLAYER_NAME]` | `game_state.player_name` |
| `[CHALLENGE_WINS]` | `game_state.challenge_wins` |
| `[ELIMINATION_WINS]` | `game_state.elimination_wins` |
| `[CHARACTER]` | Relevant NPC name from context |
| `[ALLY]` | Player's closest alliance member |

---

## Episode Structure & Pacing

The game follows a TV episode structure:

```
EPISODE 1: Introduction, Challenge 1, Elimination 1
EPISODE 2: Challenge 2, Elimination 2  
EPISODE 3: Alliance shifts, Challenge 3, Elimination 3
EPISODE 4: Final Five, Gauntlet, Elimination 4
EPISODE 5: The Finals
```

**Visual suggestions:**
- Show "EPISODE X - TITLE" cards on episode transitions
- Display day counter in corner/header
- Show remaining player count

---

## Recommended UI Elements

### Header Bar (persistent)
```
DAY 12 | EPISODE 3 | 6 PLAYERS REMAIN
```

### Relationship Panel (toggleable)
```
RELATIONSHIPS:
  Jake: ████████░░ -25 (Rival)
  Maya: ██████████ +45 (Friend)
  [etc...]
```

### Alliance Display
```
YOUR ALLIANCES: 
  • Final Three (Maya, Tyler)
```

---

## Save/Load System

Recommended save points:
- After each episode transition
- Before major choices
- Before eliminations

Save the entire `game_state` object as JSON.

---

## Character Dialogue Banks

For variety, the JSON includes `dialogue_banks` for each character. When an NPC speaks outside of scripted nodes, pull from their bank:

```json
"jake_lines": [
  "Your boy Jake didn't come here to play...",
  "Bro, do you even KNOW who I am?",
  ...
]
```

Use these for:
- Random house banter
- Reaction dialogue
- Confessional interludes

---

## DJ Deej - Host Notes

Deej is the mastermind host. He should appear:
- Before every challenge (explains rules with personality)
- During eliminations (announces format)
- At key dramatic moments
- In The Finals (personal investment)

His energy should be:
- HIGH for challenges/eliminations
- More serious/reflective for Finals and emotional moments
- Always authentic—he genuinely cares about competition

Use his `catchphrases` array for recurring lines.

---

## Endings Reference

| Ending ID | Trigger | Tone |
|-----------|---------|------|
| `ending_champion` | Win The Finals | Triumphant, emotional |
| `ending_runner_up` | 2nd in Finals | Bittersweet, motivational |
| `ending_eliminated` | Lose elimination | Reflective, determined |

---

## Quick Start Checklist

1. ☐ Parse JSON and initialize game state
2. ☐ Prompt for player name
3. ☐ Load first node (`intro_001`)
4. ☐ Implement node type handlers (narrative, choice, branch, ending)
5. ☐ Implement effects system (relationships, flags, alliances)
6. ☐ Build voting calculator
7. ☐ Build elimination resolver
8. ☐ Add save/load functionality
9. ☐ Style UI for dramatic reality TV feel

---

## Final Notes

This script is designed for **maximum replayability**. Different intro styles, alliance choices, and challenge strategies create meaningfully different paths. The relationship system ensures NPCs remember player actions.

The goal: Make players feel like they're actually ON a reality TV show—complete with drama, betrayal, strategic voting, and the ultimate prize of running The Finals.

**PAIN IS TEMPORARY. REGRET IS FOREVER. NOW GET AFTER IT.**

— DJ "Deej" Slavin
