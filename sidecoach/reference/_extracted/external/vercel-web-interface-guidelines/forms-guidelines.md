---
source: https://github.com/vercel-labs/web-interface-guidelines
source_files: [README.md, command.md]
captured: 2026-05-28
license: MIT
attribution: Vercel Labs, 2025 (MIT License)
type: external-guideline (forms / input best practices)
maps_to: extended-domain-validator FORMS_001..FORMS_020 (domain "forms")
---

# Vercel Web Interface Guidelines - Forms (VERBATIM + MAPPING)

Source prose lifted from Vercel Labs' web-interface-guidelines (MIT, 2025). Each
quoted guideline maps to a `forms`-domain rule in `extended-domain-validator.ts`.
Quotes are verbatim from the upstream Forms section; the mapping column is ours.

## SECTION 1: VERBATIM LIFT

### Autocomplete & input attributes
- "Inputs need `autocomplete` and meaningful `name`" -> FORMS_001
- "Use correct `type` (`email`, `tel`, `url`, `number`) and `inputmode`" -> FORMS_002, FORMS_003
- "Disable spellcheck on emails, codes, usernames (`spellCheck={false}`)" -> FORMS_005

### Paste & input behavior
- "Never block paste (`onPaste` + `preventDefault`)" -> FORMS_004

### Labels & hit targets
- "Labels everywhere. Every control has a `<label>` or is associated with a label for assistive tech." -> FORMS_016
- "Labels clickable (`htmlFor` or wrapping control)" -> FORMS_015
- "Checkboxes/radios: label + control share single hit target (no dead zones)" -> FORMS_015
- A placeholder is not a label; keep a persistent visible label -> FORMS_019

### Submit button & loading
- "Keep submit enabled until submission starts; then disable during the in-flight request, show a spinner, & include an idempotency key." -> FORMS_006, FORMS_007
- "Don't pre-disable submit. Allow submitting incomplete forms to surface validation feedback." -> FORMS_017

### Error handling & focus
- "Error placement. Show errors next to their fields; on submit, focus the first error." -> FORMS_008, FORMS_009
- Errored fields set `aria-invalid` and link the message via `aria-describedby` -> FORMS_018

### Placeholders
- "Placeholders end with `…` and show example pattern" -> FORMS_010

### Keyboard submission
- "Enter submits. When a text input is focused, Enter submits if it's the only control." -> FORMS_014
- "In `<textarea>`, ⌘/⌃+Enter submits; Enter inserts a new line." -> FORMS_014

### Whitespace
- "Text replacements & expansions. Some input methods add trailing whitespace. The input should trim the value to avoid showing a confusing error message." -> FORMS_012

### Password managers & one-time codes
- "Don't trigger password managers for non-auth fields. For inputs like 'Search' avoid reserved names (e.g., password), use `autocomplete=\"off\"` or a specific token like `autocomplete=\"one-time-code\"` for OTP fields." -> FORMS_011

### Unsaved changes
- "Warn before navigation with unsaved changes (`beforeunload` or router guard)" -> FORMS_013

### Autofocus
- "`autoFocus` sparingly - desktop only, single primary input; avoid on mobile" -> FORMS_020

## SECTION 2: HOW SIDECOACH USES THIS

The `forms` domain (20 rules, FORMS_001..FORMS_020) runs inside
`ExtendedDomainValidator`. Rules scan whatever markup/style is available (raw
`html`, extracted `cssRules`, or a live `htmlElement`). When no form markup is
present, a rule reports N/A (passing) rather than a false violation, so the
domain only contributes signal on components that actually contain inputs.

Flow G (component implementation) consults the forms domain on every build and
surfaces its pass rate in the checklist, guidance, and a `forms-domain-validation`
memory metric.
