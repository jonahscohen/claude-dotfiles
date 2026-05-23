// Phase IV: Entry Point System
// Unified entry point for all Sidecoach flows with intelligent routing

import { FlowId } from './types';
import { CommandMatch, parseSlashCommand, getAvailableCommands, getCommandsByPhase } from './slash-command-router';

export interface EntryPointRequest {
  utterance: string;
  userId: string;
  projectPath: string;
  sessionContext?: Record<string, any>;
}

export interface EntryPointResponse {
  isValid: boolean;
  entryType: 'slash_command' | 'natural_language' | 'composite' | 'discovery';
  selectedFlows: FlowId[];
  primaryFlow?: FlowId;
  reason: string;
  discoveryMode?: boolean;
  availableAlternatives?: FlowId[];
}

export interface EntryPointMetrics {
  totalRequests: number;
  slashCommandRequests: number;
  naturalLanguageRequests: number;
  discoveryRequests: number;
  invalidRequests: number;
  successRate: number;
  averageFlowsPerRequest: number;
}

export class SidecoachEntryPoint {
  private metrics: EntryPointMetrics = {
    totalRequests: 0,
    slashCommandRequests: 0,
    naturalLanguageRequests: 0,
    discoveryRequests: 0,
    invalidRequests: 0,
    successRate: 0,
    averageFlowsPerRequest: 0,
  };

  private flowCounts: number[] = [];

  // Keywords for natural language flow detection
  private researchKeywords = ['research', 'explore', 'discover', 'find', 'understand', 'analyze', 'learn', 'investigate'];
  private implementKeywords = ['build', 'create', 'implement', 'develop', 'make', 'code', 'construct', 'establish', 'craft', 'design'];
  private reviewKeywords = ['review', 'audit', 'check', 'verify', 'validate', 'polish', 'refine', 'improve', 'optimize'];
  private cloneKeywords = ['clone', 'match', 'copy', 'replicate', 'duplicate', 'mimic'];
  private constrainKeywords = ['constrain', 'constraint', 'limit', 'restrict', 'bound', 'define', 'rules'];
  private migrateKeywords = ['migrate', 'move', 'transfer', 'upgrade', 'update', 'convert'];
  private refactorKeywords = ['refactor', 'reorganize', 'restructure', 'rearrange', 'layout'];
  private typeKeywords = ['typography', 'type', 'font', 'text', 'typeface'];
  private motionKeywords = ['motion', 'animation', 'animate', 'movement', 'transition', 'ease'];
  private referenceKeywords = ['reference', 'curate', 'organize', 'collect', 'gather'];
  private comprehensiveKeywords = ['comprehensive', 'complete', 'full', 'all', 'qa', 'complete check', 'everything'];

  process(request: EntryPointRequest): EntryPointResponse {
    this.metrics.totalRequests++;

    // Try slash command first
    const commandMatch = parseSlashCommand(request.utterance);

    if (commandMatch.isCommand) {
      return this.handleSlashCommand(commandMatch);
    }

    // Try natural language
    return this.handleNaturalLanguage(request.utterance);
  }

  private handleSlashCommand(match: CommandMatch): EntryPointResponse {
    this.metrics.slashCommandRequests++;

    // Handle list command
    if (match.command === 'list') {
      this.metrics.discoveryRequests++;
      return {
        isValid: true,
        entryType: 'discovery',
        selectedFlows: [],
        reason: 'Flow discovery mode',
        discoveryMode: true,
      };
    }

    // Handle composite command
    if (match.command === 'composite' && match.target) {
      return {
        isValid: true,
        entryType: 'composite',
        selectedFlows: [],
        primaryFlow: match.target as FlowId,
        reason: `Composite flow: ${match.target}`,
      };
    }

    // Handle regular commands
    if (match.flowIds && match.flowIds.length > 0) {
      const primaryFlow = match.flowIds[0];
      const alternatives = match.flowIds.slice(1);

      this.recordFlowSelection(match.flowIds);

      return {
        isValid: true,
        entryType: 'slash_command',
        selectedFlows: match.flowIds,
        primaryFlow,
        reason: match.reason,
        availableAlternatives: alternatives.length > 0 ? alternatives : undefined,
      };
    }

    this.metrics.invalidRequests++;
    return {
      isValid: false,
      entryType: 'slash_command',
      selectedFlows: [],
      reason: match.reason,
    };
  }

  private handleNaturalLanguage(utterance: string): EntryPointResponse {
    this.metrics.naturalLanguageRequests++;
    const lowerUtterance = utterance.toLowerCase();

    // Detect phase/intent
    const phase = this.detectPhase(lowerUtterance);
    const command = this.mapPhaseToCommand(phase);

    if (command) {
      const commands = getAvailableCommands();
      const info = commands[command];
      if (info) {
        // Get flow IDs for this command from slash command router
        const match = parseSlashCommand(`/${command}`);
        if (match.flowIds && match.flowIds.length > 0) {
          this.recordFlowSelection(match.flowIds);
          return {
            isValid: true,
            entryType: 'natural_language',
            selectedFlows: match.flowIds,
            primaryFlow: match.flowIds[0],
            reason: `Detected ${phase} phase: ${info.description}`,
            availableAlternatives: match.flowIds.slice(1),
          };
        }
      }
    }

    this.metrics.invalidRequests++;
    return {
      isValid: false,
      entryType: 'natural_language',
      selectedFlows: [],
      reason: 'Could not determine appropriate flows from utterance',
    };
  }

  private detectPhase(utterance: string): string | null {
    if (this.matchesKeywords(utterance, this.comprehensiveKeywords)) return 'comprehensive';
    if (this.matchesKeywords(utterance, this.researchKeywords)) return 'research';
    if (this.matchesKeywords(utterance, this.implementKeywords)) return 'implement';
    if (this.matchesKeywords(utterance, this.reviewKeywords)) return 'review';
    if (this.matchesKeywords(utterance, this.cloneKeywords)) return 'clone';
    if (this.matchesKeywords(utterance, this.constrainKeywords)) return 'constrain';
    if (this.matchesKeywords(utterance, this.migrateKeywords)) return 'migrate';
    if (this.matchesKeywords(utterance, this.refactorKeywords)) return 'refactor';
    if (this.matchesKeywords(utterance, this.typeKeywords)) return 'type';
    if (this.matchesKeywords(utterance, this.motionKeywords)) return 'motion';
    if (this.matchesKeywords(utterance, this.referenceKeywords)) return 'reference';
    return null;
  }

  private mapPhaseToCommand(phase: string | null): string | null {
    const mapping: Record<string, string> = {
      'research': 'research',
      'implement': 'implement',
      'review': 'review',
      'clone': 'clone',
      'constrain': 'constrain',
      'migrate': 'migrate',
      'refactor': 'refactor',
      'type': 'type',
      'motion': 'motion',
      'reference': 'reference',
      'comprehensive': 'comprehensive',
    };
    return phase ? mapping[phase] : null;
  }

  private matchesKeywords(utterance: string, keywords: string[]): boolean {
    return keywords.some(keyword => utterance.includes(keyword));
  }

  private recordFlowSelection(flowIds: FlowId[]): void {
    this.flowCounts.push(flowIds.length);
    this.updateSuccessRate();
  }

  private updateSuccessRate(): void {
    const totalSuccessful = this.metrics.slashCommandRequests +
      this.metrics.naturalLanguageRequests +
      this.metrics.discoveryRequests;
    const total = this.metrics.totalRequests;
    this.metrics.successRate = total > 0 ? (totalSuccessful / total) * 100 : 0;
    this.metrics.averageFlowsPerRequest = this.flowCounts.length > 0
      ? this.flowCounts.reduce((a, b) => a + b, 0) / this.flowCounts.length
      : 0;
  }

  getAvailableFlows(): Record<string, string[]> {
    const commands = getAvailableCommands();
    const result: Record<string, string[]> = {};

    for (const [cmd, info] of Object.entries(commands)) {
      result[cmd] = info.flows;
    }

    return result;
  }

  getCommandsByWorkflow() {
    return getCommandsByPhase();
  }

  getMetrics(): EntryPointMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      slashCommandRequests: 0,
      naturalLanguageRequests: 0,
      discoveryRequests: 0,
      invalidRequests: 0,
      successRate: 0,
      averageFlowsPerRequest: 0,
    };
    this.flowCounts = [];
  }
}

export const globalEntryPoint = new SidecoachEntryPoint();
