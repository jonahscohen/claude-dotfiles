---
name: Task 4 - Sidecoach install.sh Block
description: Completed sidecoach install block (npm build, skills, hooks, settings.json wiring)
type: project
relates_to: [session_2026_05_23_phase_v_complete.md]
---

## Task 4: Write the install.sh Sidecoach Block - COMPLETE

Added sidecoach installation block to install.sh at line 2223-2262 (between improv and Summary sections).

### Implementation:

1. **Location:** Inserted between improv block (line 2220) and Summary section (line 2264)
2. **Components:**
   - npm install + npm run build in sidecoach directory
   - mkdir ~/.claude/skills/sidecoach
   - Symlink SKILL.md from repo to skills directory
   - Symlink three hook files: sidecoach-sessionstart.sh, sidecoach-postuserp.sh, sidecoach-postresponse.sh
   - chmod +x for all hooks
   - Node.js script to wire hooks into settings.json (SessionStart, UserPromptSubmit, Stop events)
   - Error handling with warn/ok messages

### Verification:
- Syntax check passed: `bash -n install.sh` → VALID
- Block structure matches other component blocks (improv, voice-input, voice-output pattern)
- Hook registration uses same pattern as Task 3 settings.json wiring

### Files Modified:
- /Users/spare3/Documents/Github/claude-dotfiles/install.sh (lines 2223-2262)

### Commit:
- commit 5350161 - "feat: add sidecoach install block to install.sh"

### Status: DONE

Ready for next task in 100% accessibility plan (likely Task 5 - summary/documentation update).
