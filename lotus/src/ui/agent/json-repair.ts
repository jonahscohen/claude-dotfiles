// ── JSON repair for AI-generated JSON ────────────────────────────────────────
// AI models frequently produce JSON with trailing commas, missing closing
// brackets, or other syntax errors -- especially for large nested trees.
// This attempts lightweight repair before falling back to a parse error.

export function repairJson(raw: string): string {
  let s = raw.trim();

  // Strip markdown fences if the AI wrapped the JSON in ```json ... ```
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([\]}])/g, '$1');

  // Balance brackets: count openers vs closers and append missing ones
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }
  // Append missing closers
  while (braces > 0) { s += '}'; braces--; }
  while (brackets > 0) { s += ']'; brackets--; }

  return s;
}
