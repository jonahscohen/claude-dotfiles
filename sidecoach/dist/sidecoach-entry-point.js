"use strict";
// Phase IV: Entry Point System
// Unified entry point for all Sidecoach flows with intelligent routing
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalEntryPoint = exports.SidecoachEntryPoint = void 0;
const slash_command_router_1 = require("./slash-command-router");
class SidecoachEntryPoint {
    constructor() {
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
        // Keywords for natural language flow detection
        this.researchKeywords = ['research', 'explore', 'discover', 'find', 'understand', 'analyze', 'learn', 'investigate'];
        this.implementKeywords = ['build', 'create', 'implement', 'develop', 'make', 'code', 'construct', 'establish', 'craft', 'design'];
        this.reviewKeywords = ['review', 'audit', 'check', 'verify', 'validate', 'polish', 'refine', 'improve', 'optimize'];
        this.cloneKeywords = ['clone', 'match', 'copy', 'replicate', 'duplicate', 'mimic'];
        this.constrainKeywords = ['constrain', 'constraint', 'limit', 'restrict', 'bound', 'define', 'rules'];
        this.migrateKeywords = ['migrate', 'move', 'transfer', 'upgrade', 'update', 'convert'];
        this.refactorKeywords = ['refactor', 'reorganize', 'restructure', 'rearrange', 'layout'];
        this.typeKeywords = ['typography', 'type', 'font', 'text', 'typeface'];
        this.motionKeywords = ['motion', 'animation', 'animate', 'movement', 'transition', 'ease'];
        this.referenceKeywords = ['reference', 'curate', 'organize', 'collect', 'gather'];
        this.comprehensiveKeywords = ['comprehensive', 'complete', 'full', 'all', 'qa', 'complete check', 'everything'];
    }
    process(request) {
        this.metrics.totalRequests++;
        // Try slash command first
        const commandMatch = (0, slash_command_router_1.parseSlashCommand)(request.utterance);
        if (commandMatch.isCommand) {
            return this.handleSlashCommand(commandMatch);
        }
        // Try natural language
        return this.handleNaturalLanguage(request.utterance);
    }
    handleSlashCommand(match) {
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
                primaryFlow: match.target,
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
    handleNaturalLanguage(utterance) {
        this.metrics.naturalLanguageRequests++;
        const lowerUtterance = utterance.toLowerCase();
        // Detect phase/intent
        const phase = this.detectPhase(lowerUtterance);
        const command = this.mapPhaseToCommand(phase);
        if (command) {
            const commands = (0, slash_command_router_1.getAvailableCommands)();
            const info = commands[command];
            if (info) {
                // Get flow IDs for this command from slash command router
                const match = (0, slash_command_router_1.parseSlashCommand)(`/${command}`);
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
    detectPhase(utterance) {
        if (this.matchesKeywords(utterance, this.comprehensiveKeywords))
            return 'comprehensive';
        if (this.matchesKeywords(utterance, this.researchKeywords))
            return 'research';
        if (this.matchesKeywords(utterance, this.implementKeywords))
            return 'implement';
        if (this.matchesKeywords(utterance, this.reviewKeywords))
            return 'review';
        if (this.matchesKeywords(utterance, this.cloneKeywords))
            return 'clone';
        if (this.matchesKeywords(utterance, this.constrainKeywords))
            return 'constrain';
        if (this.matchesKeywords(utterance, this.migrateKeywords))
            return 'migrate';
        if (this.matchesKeywords(utterance, this.refactorKeywords))
            return 'refactor';
        if (this.matchesKeywords(utterance, this.typeKeywords))
            return 'type';
        if (this.matchesKeywords(utterance, this.motionKeywords))
            return 'motion';
        if (this.matchesKeywords(utterance, this.referenceKeywords))
            return 'reference';
        return null;
    }
    mapPhaseToCommand(phase) {
        const mapping = {
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
    matchesKeywords(utterance, keywords) {
        return keywords.some(keyword => utterance.includes(keyword));
    }
    recordFlowSelection(flowIds) {
        this.flowCounts.push(flowIds.length);
        this.updateSuccessRate();
    }
    updateSuccessRate() {
        const totalSuccessful = this.metrics.slashCommandRequests +
            this.metrics.naturalLanguageRequests +
            this.metrics.discoveryRequests;
        const total = this.metrics.totalRequests;
        this.metrics.successRate = total > 0 ? (totalSuccessful / total) * 100 : 0;
        this.metrics.averageFlowsPerRequest = this.flowCounts.length > 0
            ? this.flowCounts.reduce((a, b) => a + b, 0) / this.flowCounts.length
            : 0;
    }
    getAvailableFlows() {
        const commands = (0, slash_command_router_1.getAvailableCommands)();
        const result = {};
        for (const [cmd, info] of Object.entries(commands)) {
            result[cmd] = info.flows;
        }
        return result;
    }
    getCommandsByWorkflow() {
        return (0, slash_command_router_1.getCommandsByPhase)();
    }
    getMetrics() {
        return { ...this.metrics };
    }
    resetMetrics() {
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
exports.SidecoachEntryPoint = SidecoachEntryPoint;
exports.globalEntryPoint = new SidecoachEntryPoint();
//# sourceMappingURL=sidecoach-entry-point.js.map