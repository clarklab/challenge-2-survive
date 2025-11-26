# Questions & Assumptions - Challenge 2 Survive

This document logs design decisions and questions that arose during development.

---

## Assumptions Made

### 1. Voting System Implementation
**Question:** Should the NPC voting algorithm described in the gameplay guide be fully implemented with the formula:
```
vote_target_score =
  (relationship_with_target × -0.3) +
  (is_alliance_enemy ? 30 : 0) +
  (threat_assessment × 20) +
  (random_factor × 10)
```

**Assumption:** For this initial frontend implementation, the voting outcomes are pre-scripted in the JSON content nodes. If dynamic NPC voting is needed, this can be added as a future enhancement. The current system follows the narrative branches in the JSON.

---

### 2. Elimination Win/Loss Calculation
**Question:** Should elimination outcomes be randomized with the 50% base probability + modifiers, or should they follow the scripted paths?

**Assumption:** Following the scripted narrative paths in the JSON for consistent story experience. Dynamic elimination outcomes could be added later for replayability.

---

### 3. Challenge Positioning System
**Question:** The gameplay guide mentions `challenge_position` effects. How should cumulative challenge positioning work across multiple stages?

**Assumption:** Using flag-based tracking (e.g., `ch1_risky1`, `ch1_safe1`) as shown in the JSON to determine branching outcomes. The system checks these flags in branch nodes to determine results.

---

### 4. Audio/Sound Effects
**Question:** Should there be 80s-style audio (beeps, bloops, synthesizer sounds) to enhance the retro experience?

**Assumption:** No audio implemented in initial version to keep it simple and mobile-friendly (many mobile users have sound off). Can be added as an enhancement.

---

### 5. Dialogue Banks Usage
**Question:** The JSON mentions `dialogue_banks` for random NPC banter. Should these be interspersed throughout the gameplay?

**Assumption:** Not implemented in initial version as the main narrative provides sufficient character dialogue. Could be added for random flavor text between major story beats.

---

### 6. Confessional Interludes
**Question:** Should there be "confessional" style cutaways where NPCs or the player share their thoughts (like real reality TV)?

**Assumption:** Not implemented - the narrative text already includes character thoughts and asides. Could be added as a toggle feature.

---

### 7. Autosave Frequency
**Question:** How often should the game autosave?

**Assumption:** Autosave occurs on every narrative and choice node to prevent progress loss. This means almost every screen transition saves.

---

### 8. Episode Transitions
**Question:** Should episode transitions have special visual treatment (e.g., "fade to black", commercial break simulation)?

**Assumption:** Episode cards are styled with a pulsing border effect. Full screen transitions could be added for more dramatic effect.

---

### 9. Mobile Keyboard
**Question:** Should the number keys for choice selection work on mobile?

**Assumption:** Touch-based selection is primary for mobile. Number keys work on desktop keyboards as a shortcut.

---

### 10. Relationship Display During Gameplay
**Question:** Should relationship changes be shown immediately when they happen?

**Assumption:** Relationship changes are silent during gameplay for immersion. Players can check the STATUS menu to see current standings. Could add optional notifications.

---

## Future Enhancement Ideas

1. **Sound Effects** - Typewriter sounds, button clicks, dramatic stings
2. **Dynamic Voting** - Full NPC voting algorithm implementation
3. **Relationship Notifications** - "+10 with Maya" pop-ups
4. **Achievement System** - Track special choices and endings
5. **Statistics Screen** - End-game stats summary
6. **Branching Visualization** - Show how your choices diverged
7. **Confessional Mode** - Player can record their own thoughts
8. **Speed Settings** - Adjustable typewriter speed
9. **Color Themes** - Amber/green/white phosphor options
10. **Character Portraits** - ASCII art character representations

---

## Technical Notes

### Browser Compatibility
- Tested patterns: Modern CSS (custom properties, flexbox)
- Font loading: @font-face with OTF
- Storage: localStorage for save/load
- Mobile: Touch events, viewport meta tags

### Performance Considerations
- Typewriter effect uses setTimeout, can be interrupted
- Large text blocks should render smoothly
- Save data is JSON serialized to localStorage

---

*Last updated: Initial development*
