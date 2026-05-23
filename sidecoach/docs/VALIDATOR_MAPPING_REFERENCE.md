# Phase H Block 7: Validator Mapping Reference

## Overview
Domain validators automatically apply to flows based on flow type. This reference documents which validators apply to each flow and their validation domains.

## Validator Types (5 total)

### accessibility
**Domain:** WCAG 2.1 AA compliance
**Rules:**
- `has_wcag_guidance` - Result includes WCAG 2.1 AA compliance guidance
- `has_testing_plan` - Result includes screen reader or accessibility testing plan
- `has_checklist` - Result includes accessibility checklist items

**Applied to flows:** flowI_accessibility

### performance
**Domain:** Motion and animation performance
**Rules:**
- `has_performance_metrics` - Result includes performance metrics or guidelines (FPS, animation, motion)
- `has_optimization_guidance` - Result includes optimization or smoothness guidance (reduced-motion, performance budget)

**Applied to flows:**
- flowE_motion_patterns
- flowJ_tactical_polish
- flowK_multi_lens_audit
- flowT_ambitious_motion

### design_system
**Domain:** Design tokens and system compliance
**Rules:**
- `uses_design_tokens` - Result references design tokens, design system, or DESIGN.md
- `has_design_rationale` - Result includes design decision rationale (why, principle, constraint)
- `validates_coverage` - Result validates design system coverage (artifacts or checklist)

**Applied to flows:**
- flowF_design_tokens
- flowA_brand_verify
- flowG_component_implementation (also requires semantic)

### semantic
**Domain:** HTML and ARIA semantic correctness
**Rules:**
- `has_semantic_guidance` - Result includes semantic HTML, ARIA, or structure guidance
- `has_implementation_details` - Result includes specific implementation details or code patterns
- `has_validation_criteria` - Result includes validation or success criteria (checklist or test guidance)

**Applied to flows:**
- flowG_component_implementation (also requires design_system)
- flowH_motion_integration

### content_quality
**Domain:** Content quality and AI-slop detection
**Rules:**
- `has_meaningful_content` - Result includes meaningful content or references (guidance or artifacts)
- `avoids_generic_content` - Result avoids overly generic or AI-slop patterns (leverage, synergy, paradigm shift, etc.)

**Applied to flows:**
- flowB_component_research
- flowC_font_research
- flowD_reference_inspiration
- flowE_motion_patterns (also requires performance)
- flowU_curate (also requires design_system)

## Flow Validator Matrix

| Flow | Flow Name | Validators |
|------|-----------|-----------|
| flowA_brand_verify | Brand/PRODUCT.md Verification | design_system |
| flowB_component_research | Component Research | content_quality |
| flowC_font_research | Font Research | content_quality |
| flowD_reference_inspiration | Reference/Inspiration Search | content_quality |
| flowE_motion_patterns | Motion Pattern Library | performance, content_quality |
| flowF_design_tokens | Design System Tokens | design_system |
| flowG_component_implementation | Component Implementation | semantic, design_system |
| flowH_motion_integration | Motion Integration | semantic, performance |
| flowI_accessibility | Accessibility Compliance | accessibility |
| flowJ_tactical_polish | Tactical Polish | performance |
| flowK_multi_lens_audit | Multi-Lens Audit | performance |
| flowT_ambitious_motion | Ambitious Motion | performance |
| flowU_curate | Curate Design References | content_quality, design_system |
| flowV_all_seven_qa | All-Seven QA Pipeline | accessibility, performance, design_system, semantic |

## Composite Workflow Configurations

### accessibility_workflow
- **Domains:** accessibility, semantic
- **Fail Mode:** soft-fail (log but continue)
- **Use case:** Accessibility-focused review flows

### performance_workflow
- **Domains:** performance, content_quality
- **Fail Mode:** soft-fail
- **Use case:** Performance and motion optimization flows

### design_system_workflow
- **Domains:** design_system, content_quality
- **Fail Mode:** soft-fail
- **Use case:** Design system compliance flows

### complete_qa_workflow
- **Domains:** accessibility, performance, design_system, semantic, content_quality
- **Fail Mode:** soft-fail
- **Use case:** Comprehensive QA review flows

## Validation Result Structure

### FlowExecutionResult.validationResults
```typescript
ValidationResult[] = [
  {
    domain: string;           // e.g., 'accessibility', 'performance'
    status: 'pass' | 'fail' | 'partial';
    passedRules: string[];    // Rules that passed
    failedRules: string[];    // Rules that failed
  }
]
```

## Soft-Fail Behavior

All validators operate in soft-fail mode:
- Validation failures are logged as warnings in the result message
- Execution continues regardless of validation status
- Failures do not halt flow execution or composition
- Validation results always stored in `FlowExecutionResult.validationResults`

### Example: Soft-Fail Message Appending
```typescript
if (failedValidations.length > 0) {
  const warningMsg = failedValidations
    .map(v => `[${v.domain}] ${v.failedRules.join(', ')}`)
    .join('; ');
  result.message = `${result.message}\n\nValidation warnings: ${warningMsg}`;
}
```

## Integration Points

### Single Flow Execution
- Location: `sidecoach-orchestrator.ts:634-647`
- Trigger: After `handler.execute()` completes successfully
- Flow: `getValidatorsForFlow(flowId)` → apply validators → store in result

### Composite Flow Execution
- Location: `sidecoach-orchestrator.ts:307-325`
- Trigger: After each composite step executes successfully
- Flow: `getValidatorsForFlow(step.flowId)` → apply validators → store in result
- Backward compatible with explicit `step.domainValidation?.domains` configuration

## Adding New Validators

To add a new validator type:

1. **Create factory function** in `flow-domain-validators.ts`:
```typescript
export function createNewDomainValidator(): DomainValidator {
  const rules: ValidationRule[] = [
    {
      name: 'rule_name',
      description: 'Rule description',
      validate: (result) => { /* validation logic */ }
    }
  ];
  return FlowCompositionEngine.createDomainValidator('new_domain', rules);
}
```

2. **Register in registerFlowDomainValidators()**:
```typescript
engine.registerDomainValidator(createNewDomainValidator());
```

3. **Add to flow mappings** in `getValidatorsForFlow()`:
```typescript
flowX_someFlow: ['new_domain'],
```

4. **Test with integration tests** following Phase H Block 7b pattern

## Backward Compatibility

Explicit domain validation configuration is still supported for composite flows:
```typescript
// Old way (explicit config) still works
step.domainValidation = {
  domains: ['accessibility', 'semantic'],
  failOnError: true  // Hard-fail if validation fails
};

// New way (automatic via getValidatorsForFlow) is default
// Automatic validators always soft-fail
```

Both approaches can coexist. Explicit validation takes precedence if both are configured.

## Validation Examples

### Example 1: Accessibility Flow
```typescript
const result = await flowI_accessibility.execute(context);
// Validators applied: ['accessibility']
// Checks for: WCAG guidance, testing plan, checklist items
// Soft-fail: warnings appended to message, execution continues
```

### Example 2: Component Implementation
```typescript
const result = await flowG_component_implementation.execute(context);
// Validators applied: ['semantic', 'design_system']
// Checks for: HTML/ARIA structure, design token usage, design rationale
// Soft-fail: both validator failures logged, execution continues
```

### Example 3: Complete QA Pipeline
```typescript
const result = await flowV_all_seven_qa.execute(context);
// Validators applied: ['accessibility', 'performance', 'design_system', 'semantic']
// Checks for: all 4 domains in parallel
// Soft-fail: each domain checked independently, all failures logged
```

## Testing

Integration test coverage: `src/__tests__/phase-h-block7-flow-validator-integration.test.ts`
- 7 tests: Validator registration and flow mapping
- 6 tests: Validator application to flow results
- 4 tests: Composite flow validator application
- 2 tests: Validator coverage verification
