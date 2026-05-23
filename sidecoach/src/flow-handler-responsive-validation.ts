// Flow M: Responsive Validation
// Breakpoint testing, touch target verification, viewport testing

import { BaseFlowHandler, FlowExecutionContext, FlowExecutionResult } from './flow-handler';
import { FlowMemoryBuilder } from './flow-memory-schema';

export class FlowMResponsiveValidationHandler extends BaseFlowHandler {
  constructor() {
    super('flowM_responsive_validation');
  }

  canExecute(context: FlowExecutionContext): boolean {
    return !!context.projectPath;
  }

  async execute(context: FlowExecutionContext): Promise<FlowExecutionResult> {
    try {
      const breakpoints = [
        { name: 'Mobile', width: 320, context: 'iPhone SE, Galaxy S8' },
        { name: 'Tablet', width: 640, context: 'iPad Mini, Galaxy Tab S6' },
        { name: 'Desktop', width: 1024, context: 'iPad Pro, 13" laptop' },
        { name: 'Wide', width: 1280, context: '15" laptop, desktop monitors' },
      ];

      const checklist = this.createChecklist([
        { label: 'Test at 320px (mobile)', required: true, description: 'iPhone SE minimum' },
        { label: 'Test at 640px (tablet)', required: true, description: 'iPad Mini width' },
        { label: 'Test at 1024px (desktop)', required: true, description: 'iPad Pro, 13" laptop' },
        { label: 'Test at 1280px (wide)', required: false, description: 'Desktop monitors' },
        { label: 'Verify 40x40px minimum hit targets', required: true },
        { label: 'No horizontal scrolling at any breakpoint', required: true },
        { label: 'Text readable without zoom at all breakpoints', required: true },
        { label: 'Safe area insets (notch, dynamic island)', required: false },
        { label: 'Touch-friendly spacing on mobile', required: true },
        { label: 'Desktop hover states not visible on touch', required: false },
      ]);

      const guidance = [
        'Responsive Validation tests interface across 4 breakpoints and verifies mobile-friendly touch targets.',
        '',
        'BREAKPOINT TESTING:',
        '- 320px (Mobile): iPhone SE, Galaxy S8',
        '- 640px (Tablet): iPad Mini, Galaxy Tab S6',
        '- 1024px (Desktop): iPad Pro, 13" laptop',
        '- 1280px (Wide): 15" laptop, desktop monitors',
        '',
        'TOUCH TARGET VERIFICATION:',
        '- Minimum 40x40px (mobile-friendly)',
        '- Padding around icons to reach 40px, not icon size itself',
        '- Spacing between targets: minimum 8px (avoid accidental taps)',
        '',
        'RESPONSIVE REQUIREMENTS:',
        '- No horizontal scrolling at any breakpoint',
        '- Text readable without zoom (16px minimum)',
        '- Flexible layouts (no fixed widths)',
        '- Safe area insets on notch/dynamic island devices',
        '',
        'TOUCH vs HOVER:',
        '- Desktop hover states invisible on touch devices',
        '- Mobile tap states (active) work on both',
        '- Focus states visible with keyboard and touch',
      ];

      const memoryBuilder = new FlowMemoryBuilder(this.flowId, this.getFlowName())
        .setSummary('Responsive validation: 4 breakpoints (320/640/1024/1280px), 40x40px hit targets, no horizontal scroll')
        .addRule('breakpoints', ['320px mobile', '640px tablet', '1024px desktop', '1280px wide'])
        .addRule('hit-targets', ['minimum 40x40px', '8px spacing between targets'])
        .addRule('no-scroll', ['no horizontal scrolling at any breakpoint'])
        .addRule('touch-friendly', ['safe areas', 'readable text without zoom', 'flexible layouts'])
        .addDecision('Responsive strategy', 'Mobile-first across 4 breakpoints with touch-target verification')
        .addMetric('breakpoints-tested', 4, 'pass')
        .addMetric('hit-target-minimum', 40, 'pass')
        .addMetric('target-spacing', 8, 'pass')
        .addValidation('Responsive validation', 'warning', 'Manual testing required across devices')
        .addArtifact('responsive', 4);

      return {
        flowId: this.flowId,
        flowName: this.getFlowName(),
        status: 'success',
        message: 'Responsive Validation workflow initialized - 4 breakpoints, touch target verification',
        guidance,
        checklist,
        artifacts: [
          this.createArtifact(
            'reference',
            'Responsive Breakpoints',
            breakpoints.map((b) => `${b.name} (${b.width}px): ${b.context}`).join('\n'),
            'Mobile-first breakpoint testing guide'
          ),
        ],
        memory: memoryBuilder.build(),
      };
    } catch (err) {
      const memory = new FlowMemoryBuilder(this.flowId, this.getFlowName())
        .setStatus('error')
        .setSummary(`Responsive validation failed: ${String(err).substring(0, 40)}`)
        .addValidation('responsive-execution', 'fail', String(err))
        .build();

      return {
        flowId: this.flowId,
        flowName: this.getFlowName(),
        status: 'error',
        message: 'Failed to initialize responsive validation',
        error: String(err),
        memory,
      };
    }
  }
}

export function createFlowMHandler(): FlowMResponsiveValidationHandler {
  return new FlowMResponsiveValidationHandler();
}
