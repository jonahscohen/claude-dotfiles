---
name: Phase 5 ProjectPersonaEngine implementation
description: Async LLM extraction of 3 project-specific personas from freeform PRODUCT.md
type: project
---

## Phase 5: ProjectPersonaEngine - IN PROGRESS

### New file created
- `src/persona-engine.ts` - 185 lines

### Implementation: Async LLM-based extraction

**Core flow:**
1. Accept `productMdContent: string` (raw PRODUCT.md text)
2. Validate non-empty (>100 chars), fallback to generic if not
3. Call Claude Opus with extraction prompt
4. Parse JSON array from response
5. Validate structure (array, non-empty, required fields)
6. Pad with generic personas if fewer than 3 returned
7. Return 3 personas (extracted or generic)

**Key code:**
```typescript
async generate(productMdContent: string): Promise<ProjectPersona[]> {
  const response = await this.client.messages.create({
    model: 'claude-opus-4-7',  // Latest Claude
    max_tokens: 2048,
    messages: [{ role: 'user', content: extractionPrompt }]
  });
  
  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  const parsed = JSON.parse(jsonMatch[0]) as ProjectPersona[];
  
  // Fallback to generic on any error or parse failure
}
```

### Fallback: 5 generic archetypes

Named personas pre-defined:
1. Alex (Power User) - high tech comfort, wants customization
2. Jordan (Designer) - medium tech, needs visual consistency
3. Sam (Manager) - low tech, needs clear status
4. Riley (Developer) - high tech, needs clean APIs
5. Casey (New User) - low tech, needs guidance

Each has: name, role, goals (3-4), frustrations (3-4), techComfort, accessibilityNeeds, testingFocus

### Error handling

On any failure:
- API unavailable: fallback
- Parse error: fallback
- Timeout: fallback
- Empty response: fallback
- Fewer than 3: pad with generic
- More than 3: return first 3

**Result:** Never crashes, always returns 3 personas (real or generic)

### Critique prompt builder

Method `toCritiquePrompt(personas)` generates a structured prompt for design review using persona data.

### Next: Wire into FlowLDesignCritiqueHandler
- Read PRODUCT.md from projectPath
- Call `engine.generate(content)`
- Build critique prompt: `engine.toCritiquePrompt(personas)`
- Use in handler guidance output

### Dependency added
- Installed: `@anthropic-ai/sdk` (for async Claude API calls)
- Model: `claude-opus-4-7` (latest Claude)

### Verification: TypeScript compilation
