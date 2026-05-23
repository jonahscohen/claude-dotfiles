// Flow N: Rapid Iteration
// Token-based variation generation, goal-driven refinement

import { BaseFlowHandler, FlowExecutionContext, FlowExecutionResult } from './flow-handler';
import { FlowMemoryBuilder } from './flow-memory-schema';

export class FlowNRapidIterationHandler extends BaseFlowHandler {
  constructor() {
    super('flowN_rapid_iteration_refined');
  }

  canExecute(context: FlowExecutionContext): boolean {
    return !!context.projectPath;
  }

  async execute(context: FlowExecutionContext): Promise<FlowExecutionResult> {
    try {
      const checklist = this.createChecklist([
        { label: 'Define iteration goal (specific, measurable)', required: true },
        { label: 'Identify 3-5 token variations', required: true },
        { label: 'Generate variations via token changes', required: true },
        { label: 'Evaluate each variation against goal', required: true },
        { label: 'Gather feedback (internal or user)', required: false },
        { label: 'Document decision rationale', required: true },
        { label: 'Implement selected variation', required: true },
        { label: 'Measure outcome against goal', required: true },
      ]);

      const guidance = [
        'Rapid Iteration uses token-based variations to quickly explore design space and refine toward a goal.',
        '',
        'GOAL DEFINITION:',
        '- Specific: "Increase visual hierarchy clarity" not "make it better"',
        '- Measurable: Heuristic evaluation, user feedback, or metric (contrast, spacing, etc.)',
        '- Time-bounded: 1-2 hour iteration cycle',
        '',
        'VARIATION GENERATION:',
        '- 3-5 variations via token changes (spacing, colors, sizing)',
        '- Keep one "control" (current state)',
        '- One "bold" (aggressive interpretation)',
        '- One-two "moderate" (conservative exploration)',
        '',
        'EVALUATION CRITERIA:',
        '- Does it move toward the goal?',
        '- Does it maintain other good properties?',
        '- Is it implementable within constraints?',
        '',
        'DOCUMENTATION:',
        '- Why each variation was considered',
        '- Which won and why',
        '- What was learned',
        '- Next hypothesis to test',
      ];

      const memoryBuilder = new FlowMemoryBuilder(this.flowId, this.getFlowName())
        .setSummary('Rapid iteration: token-based variations toward defined goal, 3-5 candidates evaluated')
        .addRule('goal', ['specific', 'measurable', 'time-bounded'])
        .addRule('variations', ['control baseline', 'bold interpretation', '1-2 moderate explorations'])
        .addRule('evaluation', ['goal achievement', 'property preservation', 'implementability'])
        .addDecision('Iteration strategy', 'Token-based variation generation with goal-driven evaluation')
        .addMetric('variations-per-cycle', 5, 'pass')
        .addMetric('evaluation-criteria', 3, 'pass')
        .addValidation('Rapid iteration', 'pass', 'Variation framework initialized')
        .addArtifact('iteration', 5);

      return {
        flowId: this.flowId,
        flowName: this.getFlowName(),
        status: 'success',
        message: 'Rapid Iteration workflow initialized - token-based variations toward goal',
        guidance,
        checklist,
        artifacts: [
          this.createArtifact(
            'reference',
            'Iteration Framework',
            'Goal Definition → Variation Generation (3-5 tokens) → Evaluation → Documentation → Implementation',
            'Goal-driven iteration cycle'
          ),
        ],
        memory: memoryBuilder.build(),
      };
    } catch (err) {
      const memory = new FlowMemoryBuilder(this.flowId, this.getFlowName())
        .setStatus('error')
        .setSummary(`Rapid iteration failed: ${String(err).substring(0, 40)}`)
        .addValidation('iteration-execution', 'fail', String(err))
        .build();

      return {
        flowId: this.flowId,
        flowName: this.getFlowName(),
        status: 'error',
        message: 'Failed to initialize rapid iteration',
        error: String(err),
        memory,
      };
    }
  }
}

export function createFlowNHandler(): FlowNRapidIterationHandler {
  return new FlowNRapidIterationHandler();
}
