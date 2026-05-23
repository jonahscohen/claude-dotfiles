// Flow S: Typography Excellence
// Kerning, variable fonts, and type system mastery

import { BaseFlowHandler, FlowExecutionContext, FlowExecutionResult } from './flow-handler';
import { FlowMemoryBuilder } from './flow-memory-schema';
import { ExtendedDomainValidator, DomainCheckContext } from './extended-domain-validator';
import { EnhancedFlowExecutionContext } from './flow-execution-context-enhanced';

export class FlowSTypographyExcellenceHandler extends BaseFlowHandler {
  constructor() {
    super('flowS_typography_excellence' as any);
  }

  canExecute(context: FlowExecutionContext): boolean {
    return !!context.projectPath;
  }

  async execute(context: FlowExecutionContext): Promise<FlowExecutionResult> {
    const enhancedContext = context as EnhancedFlowExecutionContext;
    try {
      const domainCheckContext: DomainCheckContext = {
        designTokens: context.metadata?.designTokens || {},
        typography: context.metadata?.typography || {},
        cssRules: context.metadata?.cssRules || [],
      };

      const extendedValidationReport = ExtendedDomainValidator.validateAll(domainCheckContext);
      const typographyDomainRules = ExtendedDomainValidator.getRulesByDomain('typography');

      const typographyPassRate = extendedValidationReport.passRateByDomain['typography'] || '0%';
      const typographyPassed = Math.round((parseFloat(typographyPassRate) / 100) * typographyDomainRules.length);

      if (enhancedContext?.flowMetadata) {
        enhancedContext.flowMetadata.tags = ['flowS', 'typography-excellence', 'type-mastery'];
        enhancedContext.flowMetadata.customData = {
          'typography-rules': typographyDomainRules.length,
          'typography-rules-passed': typographyPassed,
          'type-scale-levels': 12,
          'font-pairing-guidance': true,
        };
      }

      const checklist = this.createChecklist([
        { label: 'Audit current typography system', required: true },
        { label: 'Define type scale (headings + body)', required: true },
        { label: 'Select primary and fallback fonts', required: true },
        { label: 'Typography domain validation', required: false, description: `${typographyPassed}/${typographyDomainRules.length} rules passing (${typographyPassRate})` },
        { label: 'Implement line height and letter spacing', required: true },
        { label: 'Apply optical adjustments (baseline shift)', required: true },
        { label: 'Test variable font axes (if using)', required: true },
        { label: 'Verify kerning pairs and ligatures', required: true },
        { label: 'Test readability at all text sizes', required: true },
      ]);

      const guidance = [
        'Typography Excellence: Master type scales, kerning, variable fonts, and reading comfort.',
        '',
        'Domain Validation Results:',
        `- Typography domain: ${typographyPassed}/${typographyDomainRules.length} rules passing (${typographyPassRate})`,
        '',
        'TYPE SCALE:',
        '- Display: 48px, bold (h1)',
        '- Heading: 32px, semibold (h2)',
        '- Subheading: 24px, semibold (h3)',
        '- Body: 16px, regular',
        '- Small: 14px, regular',
        '- Tiny: 12px, regular',
        '',
        'KERNING & SPACING:',
        '- Line height: 1.4 for body, 1.2 for headings',
        '- Letter spacing: normal (0) for body, 0.02em for all-caps',
        '- Optical adjustments: shift baseline -1px for descenders',
        '',
        'VARIABLE FONTS:',
        '- Axes: weight (wght), optical size (opsz), slant',
        '- Usage: wght 400-700, opsz auto on font-size',
      ];

      const getSeverity = (percentage: string): 'pass' | 'warning' | 'fail' => {
        const num = parseFloat(percentage);
        if (num >= 80) return 'pass';
        if (num >= 50) return 'warning';
        return 'fail';
      };

      const memoryBuilder = new FlowMemoryBuilder(this.flowId, this.getFlowName())
        .setSummary('Typography excellence: kerning, variable fonts, and type system mastery')
        .addRule('typography', typographyDomainRules.map((r) => r.name))
        .addDecision('Type scale', 'Display → Heading → Body → Small with comfortable line height and kerning')
        .addMetric('typography-rules-passing', typographyPassed, getSeverity(typographyPassRate), typographyDomainRules.length)
        .addValidation('Typography domain', getSeverity(typographyPassRate), `${typographyPassed}/${typographyDomainRules.length} rules passing`)
        .addArtifact('type-scale', 1);

      return {
        flowId: this.flowId,
        flowName: this.getFlowName(),
        status: 'success',
        message: 'Typography excellence workflow initialized - type system mastery',
        guidance,
        checklist,
        artifacts: [
          this.createArtifact(
            'reference',
            'Type Scale',
            'Display/Heading/Body/Small with line height and kerning',
            'Typography system documentation'
          ),
        ],
        memory: memoryBuilder.build(),
      };
    } catch (err) {
      const memory = new FlowMemoryBuilder(this.flowId, this.getFlowName())
        .setStatus('error')
        .setSummary(`Typography excellence failed: ${String(err).substring(0, 40)}`)
        .addValidation('typography-execution', 'fail', String(err))
        .build();

      return {
        flowId: this.flowId,
        flowName: this.getFlowName(),
        status: 'error',
        message: 'Failed to initialize typography excellence',
        error: String(err),
        memory,
      };
    }
  }
}

export function createFlowSHandler(): FlowSTypographyExcellenceHandler {
  return new FlowSTypographyExcellenceHandler();
}
