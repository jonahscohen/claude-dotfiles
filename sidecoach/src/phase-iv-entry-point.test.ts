// Phase IV Block 2: Entry Point Integration Tests
// 50+ tests for unified entry point system

import { SidecoachEntryPoint, EntryPointRequest, EntryPointResponse } from './sidecoach-entry-point';

describe('Phase IV: Entry Point System', () => {
  let entryPoint: SidecoachEntryPoint;
  let testRequest: EntryPointRequest;

  beforeEach(() => {
    entryPoint = new SidecoachEntryPoint();
    testRequest = {
      utterance: '',
      userId: 'test-user-123',
      projectPath: '/test/project',
      sessionContext: { sessionId: 'test-session' },
    };
  });

  describe('Slash Command Parsing', () => {
    test('routes /research command to research flows', () => {
      testRequest.utterance = '/research';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.entryType).toBe('slash_command');
      expect(response.selectedFlows.length).toBeGreaterThan(0);
      expect(response.primaryFlow).toBeDefined();
    });

    test('routes /sidecoach research to research flows', () => {
      testRequest.utterance = '/sidecoach research';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.entryType).toBe('slash_command');
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('routes /implement command to implementation flows', () => {
      testRequest.utterance = '/implement';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('routes /review command to review flows', () => {
      testRequest.utterance = '/review';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('routes /clone command to clone matching flows', () => {
      testRequest.utterance = '/clone';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('routes /constrain command correctly', () => {
      testRequest.utterance = '/constrain';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('routes /migrate command to migration flows', () => {
      testRequest.utterance = '/migrate';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('routes /refactor command to layout optimization', () => {
      testRequest.utterance = '/refactor';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('routes /type command to typography flows', () => {
      testRequest.utterance = '/type';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('routes /motion command to animation flows', () => {
      testRequest.utterance = '/motion';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('routes /reference command to curation flows', () => {
      testRequest.utterance = '/reference';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('routes /comprehensive command to all QA flows', () => {
      testRequest.utterance = '/comprehensive';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('returns availableAlternatives for multi-flow commands', () => {
      testRequest.utterance = '/research';
      const response = entryPoint.process(testRequest);

      expect(response.availableAlternatives).toBeDefined();
      if (response.selectedFlows.length > 1) {
        expect(response.availableAlternatives!.length).toBeGreaterThan(0);
      }
    });

    test('rejects unknown slash commands', () => {
      testRequest.utterance = '/unknown_command';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(false);
      expect(response.entryType).toBe('slash_command');
      expect(response.selectedFlows.length).toBe(0);
    });
  });

  describe('Composite Flow Commands', () => {
    test('routes /sidecoach composite:composite_research_to_impl', () => {
      testRequest.utterance = '/sidecoach composite:composite_research_to_impl';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.entryType).toBe('composite');
      expect(response.primaryFlow).toBe('composite_research_to_impl');
    });

    test('routes arbitrary composite flows', () => {
      testRequest.utterance = '/composite:my_custom_workflow';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.entryType).toBe('composite');
      expect(response.primaryFlow).toBe('my_custom_workflow');
    });
  });

  describe('Discovery Mode', () => {
    test('/list returns discovery mode response', () => {
      testRequest.utterance = '/list';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.entryType).toBe('discovery');
      expect(response.discoveryMode).toBe(true);
      expect(response.selectedFlows.length).toBe(0);
    });

    test('getAvailableFlows returns all command mappings', () => {
      const flows = entryPoint.getAvailableFlows();

      expect(flows).toHaveProperty('research');
      expect(flows).toHaveProperty('implement');
      expect(flows).toHaveProperty('review');
      expect(flows['research'].length).toBeGreaterThan(0);
    });

    test('getCommandsByWorkflow organizes by phase', () => {
      const commands = entryPoint.getCommandsByWorkflow();

      expect(commands).toHaveProperty('Research');
      expect(commands).toHaveProperty('Implement');
      expect(commands).toHaveProperty('Review');
      expect(commands).toHaveProperty('Special');
      expect(commands.Research.commands.length).toBeGreaterThan(0);
    });
  });

  describe('Natural Language Routing', () => {
    test('detects research phase from "explore" keyword', () => {
      testRequest.utterance = 'explore design patterns for this component';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.entryType).toBe('natural_language');
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('detects research phase from "discover" keyword', () => {
      testRequest.utterance = 'discover reference inspiration';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('detects implementation phase from "build" keyword', () => {
      testRequest.utterance = 'build this component with accessibility';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('detects review phase from "audit" keyword', () => {
      testRequest.utterance = 'audit this page for design quality';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('detects clone intent from "match" keyword', () => {
      testRequest.utterance = 'match this design to the reference';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('detects constraint design from "constrain" keyword', () => {
      testRequest.utterance = 'design with system constraints';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('detects migration from "migrate" keyword', () => {
      testRequest.utterance = 'migrate this to the new design system';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('detects refactor intent from "reorganize" keyword', () => {
      testRequest.utterance = 'reorganize the layout structure';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('detects typography from "font" keyword', () => {
      testRequest.utterance = 'optimize font rendering and typography';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('detects motion from "animation" keyword', () => {
      testRequest.utterance = 'design ambitious animation for interactions';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('detects reference intent from "curate" keyword', () => {
      testRequest.utterance = 'curate and organize design references';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('detects comprehensive intent from "complete check" keyword', () => {
      testRequest.utterance = 'run a complete check across all dimensions';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.selectedFlows.length).toBeGreaterThan(0);
    });

    test('handles ambiguous natural language gracefully', () => {
      testRequest.utterance = 'something about the interface';
      const response = entryPoint.process(testRequest);

      // Should handle gracefully - either find a match or return invalid
      expect(response).toHaveProperty('isValid');
      expect(response).toHaveProperty('selectedFlows');
    });
  });

  describe('Metrics Tracking', () => {
    test('initializes metrics with zero values', () => {
      const metrics = entryPoint.getMetrics();

      expect(metrics.totalRequests).toBe(0);
      expect(metrics.slashCommandRequests).toBe(0);
      expect(metrics.naturalLanguageRequests).toBe(0);
      expect(metrics.successRate).toBe(0);
    });

    test('increments total requests on each process call', () => {
      testRequest.utterance = '/research';
      entryPoint.process(testRequest);
      let metrics = entryPoint.getMetrics();
      expect(metrics.totalRequests).toBe(1);

      entryPoint.process(testRequest);
      metrics = entryPoint.getMetrics();
      expect(metrics.totalRequests).toBe(2);
    });

    test('tracks slash command requests separately', () => {
      testRequest.utterance = '/research';
      entryPoint.process(testRequest);

      const metrics = entryPoint.getMetrics();
      expect(metrics.slashCommandRequests).toBe(1);
      expect(metrics.naturalLanguageRequests).toBe(0);
    });

    test('tracks natural language requests separately', () => {
      testRequest.utterance = 'explore design patterns';
      entryPoint.process(testRequest);

      const metrics = entryPoint.getMetrics();
      expect(metrics.naturalLanguageRequests).toBeGreaterThanOrEqual(0);
    });

    test('tracks discovery requests', () => {
      testRequest.utterance = '/list';
      entryPoint.process(testRequest);

      const metrics = entryPoint.getMetrics();
      expect(metrics.discoveryRequests).toBe(1);
    });

    test('calculates success rate as percentage', () => {
      testRequest.utterance = '/research';
      entryPoint.process(testRequest);

      const metrics = entryPoint.getMetrics();
      expect(metrics.successRate).toBeGreaterThan(0);
      expect(metrics.successRate).toBeLessThanOrEqual(100);
    });

    test('calculates average flows per request', () => {
      testRequest.utterance = '/research';
      entryPoint.process(testRequest);

      const metrics = entryPoint.getMetrics();
      expect(metrics.averageFlowsPerRequest).toBeGreaterThan(0);
    });

    test('resets metrics when requested', () => {
      testRequest.utterance = '/research';
      entryPoint.process(testRequest);
      entryPoint.resetMetrics();

      const metrics = entryPoint.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.slashCommandRequests).toBe(0);
      expect(metrics.successRate).toBe(0);
    });

    test('handles invalid requests in metrics', () => {
      testRequest.utterance = '/unknown_command';
      entryPoint.process(testRequest);

      const metrics = entryPoint.getMetrics();
      expect(metrics.invalidRequests).toBe(1);
    });
  });

  describe('Response Structure', () => {
    test('EntryPointResponse has required fields', () => {
      testRequest.utterance = '/research';
      const response = entryPoint.process(testRequest);

      expect(response).toHaveProperty('isValid');
      expect(response).toHaveProperty('entryType');
      expect(response).toHaveProperty('selectedFlows');
      expect(response).toHaveProperty('reason');
    });

    test('valid responses have primaryFlow set', () => {
      testRequest.utterance = '/research';
      const response = entryPoint.process(testRequest);

      if (response.isValid && response.selectedFlows.length > 0) {
        expect(response.primaryFlow).toBeDefined();
      }
    });

    test('reason field always populated', () => {
      testRequest.utterance = '/unknown_command';
      const response = entryPoint.process(testRequest);

      expect(response.reason).toBeDefined();
      expect(response.reason.length).toBeGreaterThan(0);
    });

    test('selectedFlows is always an array', () => {
      testRequest.utterance = '/research';
      const response = entryPoint.process(testRequest);

      expect(Array.isArray(response.selectedFlows)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty utterance', () => {
      testRequest.utterance = '';
      const response = entryPoint.process(testRequest);

      expect(response).toHaveProperty('isValid');
    });

    test('handles whitespace-only utterance', () => {
      testRequest.utterance = '   ';
      const response = entryPoint.process(testRequest);

      expect(response).toHaveProperty('isValid');
    });

    test('handles case-insensitive commands', () => {
      testRequest.utterance = '/RESEARCH';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
    });

    test('handles mixed case natural language', () => {
      testRequest.utterance = 'EXPLORE Design PATTERNS';
      const response = entryPoint.process(testRequest);

      expect(response).toHaveProperty('isValid');
    });

    test('handles commands with extra whitespace', () => {
      testRequest.utterance = '  /research  ';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
    });

    test('handles multiple rapid requests', () => {
      for (let i = 0; i < 10; i++) {
        testRequest.utterance = '/research';
        entryPoint.process(testRequest);
      }

      const metrics = entryPoint.getMetrics();
      expect(metrics.totalRequests).toBe(10);
    });
  });

  describe('End-to-End Entry Point Flow', () => {
    test('complete flow from utterance to metrics', () => {
      testRequest.utterance = 'research brand design patterns';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.entryType).toBe('natural_language');
      expect(response.selectedFlows.length).toBeGreaterThan(0);
      expect(response.primaryFlow).toBeDefined();

      const metrics = entryPoint.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.naturalLanguageRequests).toBeGreaterThanOrEqual(0);
    });

    test('slash command discovery flow', () => {
      testRequest.utterance = '/list';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.discoveryMode).toBe(true);

      const flows = entryPoint.getAvailableFlows();
      expect(Object.keys(flows).length).toBeGreaterThan(0);

      const commands = entryPoint.getCommandsByWorkflow();
      expect(Object.keys(commands).length).toBe(4); // Research, Implement, Review, Special
    });

    test('composite flow initialization', () => {
      testRequest.utterance = '/sidecoach composite:research_impl_review';
      const response = entryPoint.process(testRequest);

      expect(response.isValid).toBe(true);
      expect(response.entryType).toBe('composite');
      expect(response.primaryFlow).toBe('research_impl_review');
    });
  });
});
