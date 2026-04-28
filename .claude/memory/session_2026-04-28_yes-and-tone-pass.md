---
name: README tone pass to align with Yes& agency brand voice
description: Rewrote opener with Draft C ("We start with yes, and build what's next..."), tightened the high-level tier with action-coded couplets, fixed Yes&er overreach (engineering dotfiles ship to Yes& developers, not all Yes&ers), added a tactile "We start with yes. You build what's next." closer that mirrors the opener and the brand's improv motif.
type: project
---

Collaborator: Jonah Cohen

# What changed

## Voice-source reference

Studied [yesandagency.com](https://yesandagency.com) for tone signatures. Key extracts:

- Headline pattern: "Yes& is an independent, fully-integrated creative agency designed to redefine what's possible."
- Couplet rhythm: "Ideas that spark. Work that performs."
- Generative motif: "We start with 'yes' and build what's next."
- Action verbs: build, push, redefine, turn into, spark, perform.
- Branded vocabulary: "Yes&ers", "the unlimited power of '&'", "fully-integrated", "independent".
- Three-part sensory close: "something you can see, feel, and measure."
- Register: confident-conversational, optimistic without saccharine.

## Edits to README.md

### Hero/opener (Draft C, comma-converted from emdash)

Before: "This is the configuration that turns a fresh Mac into a Yes& development machine. It is opinionated. It expects you to make things. It assumes you care how those things feel and behave."

After: "We start with yes, and build what's next. These dotfiles are the '&.' Confident defaults. Real discipline. The Yes& development stack distilled into one curl, deployed in seconds, opinionated by design. If you ship things and care how they feel, you'll feel right at home."

Note: Yes& website uses an emdash in "yes - and" but our content-guard hook bans emdashes. Comma version is actually more on-brand because "yes, and..." is the literal improv-comedy phrase the company name distills.

### Three-tier intro tightened

Before: "The README is laid out in three tiers, so you can stop reading at any point and still know what you need to know:" + verbose bullets.

After: "Three tiers. Stop at any point and still know what you need:" + tighter parallel bullets. Each bullet ends with a short tactile clause ("Done.", "why it's there", "every gotcha").

### Quick start

Removed the "Unpacking installer..." narration (already covered elsewhere). Added one Yes&-coded sentence: "The shortcut is the '&' - it's how you keep saying yes to what's next without leaving the terminal." This ties the literal `ampersand` shell command to the brand's "&" operator.

### "What this is"

Tightened: "These dotfiles aren't a config. They're the engineering team's earned practice, made portable." Two parallel short sentences, last one with a direct verb ("made portable") that echoes the agency's "redefine what's possible" rhythm.

### "What it does for you" - the 5 things

Sharpened with action verbs and parallel rhythm. Examples:

- "New Yes& developer, fresh Mac, one curl. Indistinguishable from the rest of the engineering team by lunch." (was: long parenthetical noun-clause)
- "Hooks block legacy model IDs, AI-attribution lines, and emoji before they land." (cleaner verb position)
- "Generated UI lands on-brand by default, not by accident." ("lands" is action-coded)
- "Memory across machines, across Yes& devs." (parallel triplet structure)
- "Your content stays. Ours layers on." (couplet close)

### Three-layer design stack

Last line gained a sensory close: "Generated UI lands seen, felt, and on-brand." Echoes Yes&'s "see, feel, and measure" three-part rhythm.

### "Why we built this"

Added the connecting sentence "We pulled them into one place, made them installable, and made them yours by typing `ampersand`." Three-part action verb rhythm. Names the literal command as the deliverable.

### "What this isn't"

Tightened from three full sentences to three em-dash-style asides (using hyphens-with-spaces because the content-guard bans emdashes). "...by design" close on the third item is a Yes&-style emphasis.

### Memory section opener

Before: "Memory is the thing that turns Claude Code from a stateless code generator into a colleague..."
After: "Memory turns Claude Code from a stateless code generator into a colleague..."

Cut "the thing that" - removed weasel phrasing.

### Footer

Added a final tactile line: "We start with yes. You build what's next." Mirrors the opener and shifts the second clause from "we" to "you" so the reader is the actor at the close. Yes&-style outcome.

## Yes&er vs Yes& dev correction (mid-pass)

User flagged that "Every Yes&er runs Claude Code" overstates - dotfiles are for developers specifically, not all Yes& employees. Audit found seven instances. Corrections:

- "When a Yes&er learns" -> "When a Yes& developer learns"
- "every other Yes&er's machine" -> "every other Yes& dev's machine"
- "New Yes&er" -> "New Yes& developer"
- "Memory across machines, across Yes&ers" -> "Memory across machines, across Yes& devs"
- "most Yes&ers just hit enter" -> "most Yes& devs just hit enter"
- "Yes&ers stack three tools" -> "Yes& devs stack three tools"
- "The next Yes&er starts where you left off" -> "The next Yes& dev starts where you left off"
- "Every Yes&er runs Claude Code" -> "Every Yes& developer runs Claude Code"
- "For Yes& people:" (in plugin guidance) -> "For Yes& devs:"

Yes&-only references retained where they refer to the agency or brand-level concepts ("Yes& work", "Yes& design brain", "Yes&-wide feedback", "Yes& project", section header "For Yes& teams").

## Files touched

- `README.md` (tone pass + Yes& dev vs Yes&er correction)
- `.claude/memory/session_2026-04-28_yes-and-tone-pass.md` (this file)
- `.claude/memory/MEMORY.md` (index entry)
