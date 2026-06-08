---
name: CLAUDE.md trimmed under the 40k-char load limit by externalizing infra (zero behavioral rules touched)
description: Jonah's harness warned CLAUDE.md was 41.4k over the 40k-char limit (the always-loaded global instructions, a DIFFERENT file/limit than the MEMORY.md beats index we auto-compact). It was silently truncating my own rules = the real quality risk. Fixed by moving 3 pure-infrastructure sections (voice setup, Discord onboarding, transcription pipeline) to claude/docs/voice-discord-infra.md, leaving the behavioral rule + a pointer in each. 41410 -> 37257 chars. Every MANDATORY rule intact, zero content lost.
type: project
relates_to: [feedback_shortcuts_are_lies.md, session_2026-06-05_memory-index-auto-compaction.md]
---

Collaborator: Jonah. 2026-06-06.

## The problem (and the honest quality framing)
Harness warning: ~/.claude/CLAUDE.md over the 40.0k-char limit (41.2k). This is the GLOBAL INSTRUCTIONS file (symlinked from claude/CLAUDE.md), NOT the MEMORY.md beats index (different file, different limit - the auto-compaction we built is for MEMORY.md only). Over the limit, the harness TRUNCATES CLAUDE.md - so my own behavioral rules were silently dropping out of context mid-session. That truncation IS the quality risk; getting under-limit so it loads fully is a quality GAIN, not a sacrifice. Jonah's explicit condition: do not sacrifice output quality.

## The principle (what is safe to move, what is not)
Only move NON-BEHAVIORAL infrastructure: setup/pipeline trivia looked up situationally, whose enforcement is a HOOK (so behavior runs off the hook, not off the prose being in-context). Keep EVERY behavioral rule verbatim + the one-line behavioral nub of each moved section. Never tighten/trim the MANDATORY rule sections (that risks weakening force - higher judgment, not done).

## What moved (to claude/docs/voice-discord-infra.md, verbatim)
1. Voice Output -> kept the gating RULE (voice-mandate hook is the single source of truth; load/call speak only when the active mandate is in context; muted/no-mandate = skip speak entirely; never speak code/paths). Moved the "### Infrastructure" (keychain key, 13 voices, .voice-config, verbosity/speed) + "### Discord voice replies" (tts-generate OGG pipeline) subsections.
2. Voice transcription -> kept the RULE (transcribe audio attachments BEFORE responding via ~/.claude/transcribe; never fabricate). Moved the whisper.cpp/ffmpeg/model-override pipeline + install detail.
3. Discord Chat Agent -> kept the operational nubs (point colleagues at bash ~/.claude/discord-onboard.sh; the "not allowlisted while paired" -> discord-onboard.sh --repair recovery). Moved the cold/mid/warm launcher-state logic + the OAuth onboarding walkthrough + the allowlist-resync mechanics.

## Verified
- CLAUDE.md 41410 -> 37257 chars (< 40000, 2743 headroom). Live ~/.claude/CLAUDE.md symlink reflects it.
- All 14 MANDATORY/behavioral sections still present (Beats Discipline, Code Quality, Verification Protocol, Debugging, Self-Analysis, Gut Check, Hook Override, Style Guide, Question-Asking, Design/Sidecoach, Design Peer Skills, Reflect, Permission Posture, cmux Browser Pane) - none touched.
- Voice gating rule + transcribe + discord-repair nubs confirmed retained in CLAUDE.md.
- 5/5 moved-content markers preserved verbatim in the doc (13 voices, tts-generate, whisper ggml-base.en, Message Content Intent, allowlist re-arm). Zero loss.

## Note / next lever if it teeters again
Content reduction of CLAUDE.md is JUDGMENT (can't auto-archive rules like the MEMORY index), so no hook-automation for it - the harness already warns at the limit, which is the trigger. If it grows back toward 40k, the next safe externalization is the cmux Browser Pane command reference (keep "use cmux/screenshots for visual verification" rule, move the command detail). Do NOT cut behavioral rule sections.

## Files
- claude/docs/voice-discord-infra.md (new - the moved infra, verbatim)
- claude/CLAUDE.md (3 sections -> rule + pointer; all rules untouched)
