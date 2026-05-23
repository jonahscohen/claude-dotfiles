"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowExecutionEngine = void 0;
exports.createExecutionEngine = createExecutionEngine;
const intent_detector_1 = require("./intent-detector");
const flows_1 = require("./flows");
const flow_history_1 = require("./flow-history");
const orchestrator_1 = require("./orchestrator");
const deterministic_validator_1 = require("./deterministic-validator");
const regression_detector_1 = require("./regression-detector");
const design_debt_tracker_1 = require("./design-debt-tracker");
const project_context_1 = require("./project-context");
const context_loader_1 = require("./context-loader");
const session_memory_writer_1 = require("./session-memory-writer");
const slash_command_router_1 = require("./slash-command-router");
const sidecoach_entry_point_1 = require("./sidecoach-entry-point");
const teach_command_handler_1 = require("./teach-command-handler");
const flow_prerequisites_1 = require("./flow-prerequisites");
const flow_composition_1 = require("./flow-composition");
const flow_domain_validators_1 = require("./flow-domain-validators");
const flow_execution_context_enhanced_1 = require("./flow-execution-context-enhanced");
const flow_handler_brand_verify_1 = require("./flow-handler-brand-verify");
const flow_handler_component_research_1 = require("./flow-handler-component-research");
const flow_handler_font_research_1 = require("./flow-handler-font-research");
const flow_handler_design_references_1 = require("./flow-handler-design-references");
const flow_handler_motion_patterns_1 = require("./flow-handler-motion-patterns");
const flow_handlers_core_1 = require("./flow-handlers-core");
const flow_handlers_extended_1 = require("./flow-handlers-extended");
const flow_handler_design_tokens_1 = require("./flow-handler-design-tokens");
const flow_handler_component_implementation_1 = require("./flow-handler-component-implementation");
const flow_handler_motion_integration_1 = require("./flow-handler-motion-integration");
const flow_handler_accessibility_1 = require("./flow-handler-accessibility");
const flow_handlers_tier3_tier4_1 = require("./flow-handlers-tier3-tier4");
const flow_handlers_tier5_specialized_1 = require("./flow-handlers-tier5-specialized");
const flow_handlers_curate_qa_1 = require("./flow-handlers-curate-qa");
// Phase III: Performance, Validation, Metrics
const flow_performance_cache_1 = require("./flow-performance-cache");
const flow_specific_validators_1 = require("./flow-specific-validators");
const flow_metrics_tracker_1 = require("./flow-metrics-tracker");
const flow_conditional_router_1 = require("./flow-conditional-router");
class FlowExecutionEngine {
    constructor() {
        this.intentDetector = (0, intent_detector_1.createDetector)();
        this.handlers = new Map();
        const flowHistory = (0, flow_history_1.getFlowHistory)();
        this.orchestrator = new orchestrator_1.SidecoachOrchestrator(flowHistory);
        this.compositionEngine = new flow_composition_1.FlowCompositionEngine();
        this.contextManager = new flow_execution_context_enhanced_1.EnhancedContextManager();
        this.initializeHandlers();
        this.initializeValidators();
    }
    initializeValidators() {
        // Register all domain validators for flow execution
        (0, flow_domain_validators_1.registerFlowDomainValidators)(this.compositionEngine);
        // Register context propagation rules for flow sequences
        for (const rule of flow_execution_context_enhanced_1.COMMON_PROPAGATION_RULES) {
            this.contextManager.registerPropagationRule(rule);
        }
    }
    initializeHandlers() {
        // Register all flow handlers with their implementations
        const handlerMap = [
            // Tier 1: Strategy/Research
            ['flowA_brand_verify', () => new flow_handler_brand_verify_1.FlowABrandVerifyHandler()],
            ['flowB_component_research', () => new flow_handler_component_research_1.FlowBComponentResearchHandler()],
            ['flowC_font_research', () => new flow_handler_font_research_1.FlowCFontResearchHandler()],
            ['flowD_reference_inspiration', () => new flow_handler_design_references_1.FlowDReferenceSearchHandler()],
            ['flowE_motion_patterns', () => new flow_handler_motion_patterns_1.FlowEMotionPatternsHandler()],
            // Tier 2: Execution
            ['flowF_design_tokens', () => new flow_handler_design_tokens_1.FlowFDesignTokensHandler()],
            ['flowG_component_implementation', () => new flow_handler_component_implementation_1.FlowGComponentImplementationHandler()],
            ['flowH_motion_integration', () => new flow_handler_motion_integration_1.FlowHMotionIntegrationHandler()],
            ['flowI_accessibility', () => new flow_handler_accessibility_1.FlowIAccessibilityHandler()],
            // Tier 3: Polish/QA
            ['flowJ_tactical_polish', () => new flow_handlers_tier3_tier4_1.FlowJTacticalPolishHandler()],
            ['flowK_multi_lens_audit', () => new flow_handlers_tier3_tier4_1.FlowKMultiLensAuditHandler()],
            ['flowL_design_critique', () => new flow_handlers_tier3_tier4_1.FlowLDesignCritiqueHandler()],
            ['flowM_responsive_validation', () => new flow_handlers_tier3_tier4_1.FlowMResponsiveValidationHandler()],
            ['flowN_rapid_iteration_refined', () => new flow_handlers_tier3_tier4_1.FlowNRapidIterationHandler()],
            // Tier 4: Special
            ['flowO_clone_match_special', () => new flow_handlers_tier3_tier4_1.FlowOCloneMatchHandler()],
            ['flowP_constraint_design_special', () => new flow_handlers_tier3_tier4_1.FlowPConstraintDesignHandler()],
            ['flowQ_migration_special', () => new flow_handlers_tier3_tier4_1.FlowQMigrationHandler()],
            // Tier 5: Specialized refinement (NEW - impeccable v2.1.9 coverage)
            ['flowR_layout_optimization', () => new flow_handlers_tier5_specialized_1.FlowRLayoutOptimizationHandler()],
            ['flowS_typography_excellence', () => new flow_handlers_tier5_specialized_1.FlowSTypographyExcellenceHandler()],
            ['flowT_ambitious_motion', () => new flow_handlers_tier5_specialized_1.FlowTAmbitiousMotionHandler()],
            // Special: Curate + All-Seven QA (addresses two concrete gaps)
            ['flowU_curate', () => new flow_handlers_curate_qa_1.FlowUCurateHandler()],
            ['flowV_all_seven_qa', () => new flow_handlers_curate_qa_1.FlowVAllSevenQAHandler()],
            // Legacy flows
            ['flow1_clone_match', () => new flow_handlers_extended_1.Flow1CloneHandler()],
            ['flow2_polish_enhance', () => new flow_handlers_core_1.Flow2PolishHandler()],
            ['flow3_audit_page', () => new flow_handlers_extended_1.Flow3AuditHandler()],
            ['flow4_explore_discovery', () => new flow_handlers_extended_1.Flow4ExploreHandler()],
            ['flow5_review_qa', () => new flow_handlers_core_1.Flow5ReviewHandler()],
            ['flow6_constraint_design', () => new flow_handlers_extended_1.Flow6ConstraintHandler()],
            ['flow7_design_component', () => new flow_handlers_core_1.Flow7DesignHandler()],
            ['flow8_refactor_layout', () => new flow_handlers_extended_1.Flow8RefactorHandler()],
            ['flow9_accessible', () => new flow_handlers_extended_1.Flow9AccessibleHandler()],
            ['flow10_implement_design', () => new flow_handlers_core_1.Flow10ImplementHandler()],
            ['flow11_extract_tokens', () => new flow_handlers_extended_1.Flow11ExtractHandler()],
            ['flow12_responsive_review', () => new flow_handlers_extended_1.Flow12ResponsiveHandler()],
            ['flow13_rapid_iteration', () => new flow_handlers_extended_1.Flow13IterateHandler()],
            ['flow14_migration', () => new flow_handlers_extended_1.Flow14MigrationHandler()],
        ];
        for (const [flowId, createHandler] of handlerMap) {
            this.handlers.set(flowId, createHandler());
        }
    }
    recordFlowWithMemory(result) {
        const flowHistory = (0, flow_history_1.getFlowHistory)();
        const entry = {
            flowId: result.flowId,
            flowName: result.flowName,
            status: result.status,
            message: result.message,
            guidance: result.guidance,
            checklist: result.checklist,
            artifacts: result.artifacts,
            error: result.error,
        };
        // Merge memory data if present
        if (result.memory) {
            const memory = result.memory;
            entry.appliedRules = memory.appliedRules;
            entry.userDecisions = memory.userDecisions;
            entry.metrics = memory.metrics;
            entry.validationResults = memory.validationResults;
            entry.referencesUsed = memory.referencesUsed;
            entry.gates = memory.gates;
            entry.artifactProduced = memory.artifactProduced;
            entry.aiSlopDetection = memory.aiSlopDetection;
            entry.summary = memory.summary;
        }
        flowHistory.recordFlow(entry);
    }
    // Phase III: Performance & Validation Integration
    validateFlowExecution(flowId, context, result) {
        // Run flow-specific validators
        const validation = flow_specific_validators_1.FlowSpecificValidator.validateFlow(flowId, context, result);
        if (validation.warnings.length > 0) {
            console.log(`[Validation Warnings] ${flowId}:`, validation.warnings);
        }
    }
    cacheFlowResult(flowId, result) {
        // Cache execution result for performance
        flow_performance_cache_1.globalPerformanceCache.cacheHandlerResult(flowId, result);
    }
    trackFlowMetrics(flowId, flowName, executionId, result, context) {
        // Track metrics for this flow execution
        flow_metrics_tracker_1.globalMetricsTracker.startTracking(flowId, flowName, executionId);
        // Record guidance as decisions
        if (result.guidance && result.guidance.length > 0) {
            flow_metrics_tracker_1.globalMetricsTracker.recordDecision(executionId, `flow-executed-${flowId}`, result.message, 'high');
        }
        // Record checklist progress
        if (result.checklist) {
            const completed = result.checklist.filter(item => item.completed).length;
            flow_metrics_tracker_1.globalMetricsTracker.updateChecklistProgress(executionId, completed, result.checklist.length);
        }
        // Record artifacts
        if (result.artifacts && result.artifacts.length > 0) {
            for (const artifact of result.artifacts) {
                // Map FlowArtifact types to ArtifactRecord types
                const typeMap = {
                    'script': 'code',
                    'command': 'code',
                    'checklist': 'checklist',
                    'reference': 'reference',
                    'template': 'template',
                };
                const recordType = typeMap[artifact.type] || 'template';
                flow_metrics_tracker_1.globalMetricsTracker.recordArtifact(executionId, recordType, artifact.name, artifact.description || '');
            }
        }
        // Complete tracking and store metrics
        flow_metrics_tracker_1.globalMetricsTracker.completeTracking(executionId, {
            projectPath: context?.projectPath,
            userId: context?.userId,
            metadataKeys: context?.metadata ? Object.keys(context.metadata) : [],
        });
    }
    determineConditionalFlow(context) {
        // Evaluate conditional execution routing
        return flow_conditional_router_1.FlowConditionalRouter.determineRoute(context) || null;
    }
    getExecutablePath(context) {
        // Get the conditional execution path for a context
        return flow_conditional_router_1.FlowConditionalRouter.getExecutablePath(context);
    }
    processWithEntryPoint(utterance, context = {}) {
        // Process utterance through unified entry point system
        const entryPointRequest = {
            utterance,
            userId: context.userId || 'unknown',
            projectPath: context.projectPath || process.cwd(),
            sessionContext: context.metadata,
        };
        const entryPointResponse = sidecoach_entry_point_1.globalEntryPoint.process(entryPointRequest);
        // Record entry point request in context metadata if available
        if (context.metadata) {
            context.metadata.entryPointType = entryPointResponse.entryType;
            context.metadata.entryPointFlows = entryPointResponse.selectedFlows;
            context.metadata.entryPointReason = entryPointResponse.reason;
        }
        if (!entryPointResponse.isValid || entryPointResponse.selectedFlows.length === 0) {
            return null;
        }
        return {
            flowIds: entryPointResponse.selectedFlows,
            entryType: entryPointResponse.entryType,
            primaryFlow: entryPointResponse.primaryFlow,
        };
    }
    async process(utterance, context = {}) {
        // Step 0: Load project context (PRODUCT.md, DESIGN.md, register detection)
        const projectPath = context.projectPath || process.cwd();
        const loadedContext = (0, context_loader_1.buildProjectContext)(projectPath);
        const enrichedContext = {
            ...context,
            projectPath,
            metadata: {
                ...(context.metadata || {}),
                register: loadedContext.register,
                productContent: loadedContext.productContent,
                designContent: loadedContext.designContent,
                hasFullContext: loadedContext.hasFullContext,
            },
        };
        // Step 1: Check for empty input (show interactive menu)
        if (!utterance || utterance.trim() === '' || utterance === '/sidecoach') {
            return this.showInteractiveMenu(enrichedContext);
        }
        // Step 2: Check for slash commands (deterministic routing)
        const commandMatch = (0, slash_command_router_1.parseSlashCommand)(utterance);
        if (commandMatch.isCommand) {
            if (commandMatch.command === 'teach') {
                const teachHandler = new teach_command_handler_1.TeachCommandHandler();
                const result = await teachHandler.execute({
                    utterance,
                    userId: context.userId,
                    projectPath: context.projectPath || process.cwd(),
                    currentFile: context.currentFile,
                    selectedText: context.selectedText,
                    metadata: context.metadata,
                });
                return {
                    success: true,
                    message: result.message,
                    detectedFlow: null,
                    flowResults: [result],
                    guidance: result.guidance,
                    checklist: result.checklist,
                    artifacts: result.artifacts,
                };
            }
            if (commandMatch.command === 'list') {
                const byPhase = (0, slash_command_router_1.getCommandsByPhase)();
                const groupedGuidance = [];
                // Build grouped output by phase
                for (const phase of ['Research', 'Implement', 'Review', 'Special']) {
                    const phaseCommands = byPhase[phase]?.commands || [];
                    if (phaseCommands.length > 0) {
                        groupedGuidance.push(`\n## ${phase} Phase (${phaseCommands.length} commands)`);
                        for (const cmd of phaseCommands) {
                            groupedGuidance.push(`  /sidecoach ${cmd.command} - ${cmd.description} (${cmd.flowCount} flows)`);
                        }
                    }
                }
                return {
                    success: true,
                    message: 'Available Sidecoach Commands (grouped by workflow phase)',
                    detectedFlow: null,
                    flowResults: [],
                    guidance: groupedGuidance,
                };
            }
            // Handle composite flow execution
            if (commandMatch.command === 'composite') {
                const compositeFlowId = commandMatch.target;
                if (!compositeFlowId) {
                    return {
                        success: false,
                        message: 'Please specify composite flow ID: /sidecoach composite:<flow-id>',
                        detectedFlow: null,
                        flowResults: [],
                        guidance: [
                            'Available composite flows:',
                            '  /sidecoach composite:composite_research_to_impl - Research to Implementation (9 flows)',
                            '  /sidecoach composite:composite_qa_workflow - Quality Assurance (4 flows)',
                            '  /sidecoach composite:composite_optimization - Complete Optimization (5 flows)',
                        ],
                    };
                }
                // Find the composite flow definition
                const compositeFlow = flow_composition_1.PRESET_COMPOSITE_FLOWS.find(cf => cf.id === compositeFlowId);
                if (!compositeFlow) {
                    return {
                        success: false,
                        message: `Composite flow not found: ${compositeFlowId}`,
                        detectedFlow: null,
                        flowResults: [],
                    };
                }
                // Execute composite flow steps
                const executionContext = {
                    utterance,
                    userId: context.userId,
                    projectPath: context.projectPath || process.cwd(),
                    currentFile: context.currentFile,
                    selectedText: context.selectedText,
                    metadata: { ...context.metadata, compositeFlowId },
                };
                const flowResults = [];
                const flowHistory = (0, flow_history_1.getFlowHistory)();
                const historyEntries = flowHistory.getFlowSequence();
                const startTime = Date.now();
                for (const step of compositeFlow.steps) {
                    const handler = this.handlers.get(step.flowId);
                    if (!handler)
                        continue;
                    // Check prerequisites
                    const prerequisiteCheck = flow_prerequisites_1.FlowPrerequisiteValidator.canExecute(step.flowId, historyEntries);
                    if (!prerequisiteCheck.canExecute) {
                        if (step.skipOnError) {
                            flowResults.push({
                                flowId: step.flowId,
                                flowName: step.flowId,
                                status: 'skipped',
                                message: `Prerequisites not met: ${prerequisiteCheck.reason}`,
                                guidance: [],
                                checklist: [],
                            });
                            continue;
                        }
                        else if (compositeFlow.failOnFirstError) {
                            return {
                                success: false,
                                message: `Composite flow halted: ${step.flowId} failed prerequisites`,
                                detectedFlow: null,
                                flowResults,
                            };
                        }
                        flowResults.push({
                            flowId: step.flowId,
                            flowName: step.flowId,
                            status: 'error',
                            message: `Prerequisites not met: ${prerequisiteCheck.reason}`,
                            guidance: [],
                            checklist: [],
                        });
                        continue;
                    }
                    // Execute the flow with context tracking
                    if (handler.canExecute(executionContext)) {
                        try {
                            // Track flow entry in execution chain
                            this.contextManager.addToExecutionChain(step.flowId, step.flowId);
                            // Execute the handler
                            const result = await handler.execute(executionContext);
                            // Track flow completion in execution chain
                            this.contextManager.completeInChain(step.flowId, result.status === 'success' ? 'completed' : 'error', result.message);
                            // Store execution metadata in result
                            result.executionMetadata = {
                                executionChain: this.contextManager.getExecutionChain(),
                                executionDuration: this.contextManager.getExecutionDuration(step.flowId),
                            };
                            this.recordFlowWithMemory(result);
                            // Apply automatic domain validators based on flow type (soft-fail)
                            if (result.status === 'success') {
                                const validatorsForFlow = (0, flow_domain_validators_1.getValidatorsForFlow)(step.flowId);
                                if (validatorsForFlow.length > 0) {
                                    const validations = this.compositionEngine.validateMultipleDomains(validatorsForFlow, result);
                                    result.validationResults = validations;
                                    // Log validation failures as warnings (soft-fail mode)
                                    const failedValidations = validations.filter(v => v.status !== 'pass');
                                    if (failedValidations.length > 0) {
                                        const warningMsg = failedValidations
                                            .map(v => `[${v.domain}] ${v.failedRules.join(', ')}`)
                                            .join('; ');
                                        result.message = `${result.message}\n\nValidation warnings: ${warningMsg}`;
                                    }
                                }
                            }
                            // Also support explicit domain validation if configured in the step
                            if (step.domainValidation?.domains && step.domainValidation.domains.length > 0) {
                                const validations = this.compositionEngine.validateMultipleDomains(step.domainValidation.domains, result);
                                result.validationResults = validations;
                                // Check if any validation failed
                                const allPassed = flow_composition_1.FlowCompositionEngine.allValidationsPassed(validations);
                                if (!allPassed && step.domainValidation.failOnError) {
                                    // Halt composition on validation failure
                                    return {
                                        success: false,
                                        message: `Composite flow halted: ${step.flowId} failed domain validation`,
                                        detectedFlow: null,
                                        flowResults: [...flowResults, result],
                                    };
                                }
                            }
                            flowResults.push(result);
                            // Apply context transformation if defined
                            if (step.transformContext) {
                                Object.assign(executionContext, step.transformContext(executionContext, result));
                            }
                            else {
                                // Default: propagate context
                                Object.assign(executionContext, flow_composition_1.FlowCompositionEngine.propagateContext(executionContext, result));
                            }
                        }
                        catch (err) {
                            const errorResult = {
                                flowId: step.flowId,
                                flowName: step.flowId,
                                status: 'error',
                                message: `Flow execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
                                guidance: [],
                                checklist: [],
                                error: err instanceof Error ? err.message : 'Unknown error',
                            };
                            // Track error in execution chain
                            this.contextManager.completeInChain(step.flowId, 'error', errorResult.message);
                            errorResult.executionMetadata = {
                                executionChain: this.contextManager.getExecutionChain(),
                                executionDuration: this.contextManager.getExecutionDuration(step.flowId),
                            };
                            flowResults.push(errorResult);
                            if (!step.skipOnError && compositeFlow.failOnFirstError) {
                                return {
                                    success: false,
                                    message: `Composite flow halted: ${step.flowId} failed`,
                                    detectedFlow: null,
                                    flowResults,
                                };
                            }
                        }
                    }
                }
                const totalTime = Date.now() - startTime;
                // Aggregate results if requested
                let aggregatedGuidance = [];
                let aggregatedChecklist = [];
                if (compositeFlow.aggregateResults) {
                    const aggregated = flow_composition_1.FlowCompositionEngine.aggregateResults(flowResults);
                    aggregatedGuidance = aggregated.guidance;
                    aggregatedChecklist = aggregated.checklist;
                }
                return {
                    success: flowResults.some(r => r.status === 'success'),
                    message: `Composite flow complete: ${compositeFlow.name} (${flowResults.filter(r => r.status === 'success').length}/${flowResults.length} flows successful, ${totalTime}ms)`,
                    detectedFlow: {
                        flowId: compositeFlowId,
                        flowName: compositeFlow.name,
                        confidence: 1.0,
                    },
                    flowResults,
                    guidance: aggregatedGuidance.length > 0 ? aggregatedGuidance : undefined,
                    checklist: aggregatedChecklist.length > 0 ? aggregatedChecklist : undefined,
                };
            }
            // Route to command's flow chain
            const executionContext = {
                utterance,
                userId: context.userId,
                projectPath: context.projectPath || process.cwd(),
                currentFile: context.currentFile,
                selectedText: context.selectedText,
                metadata: { ...context.metadata, commandTarget: commandMatch.target },
            };
            const flowResults = [];
            let detectedFlow = null;
            const flowHistory = (0, flow_history_1.getFlowHistory)();
            const historyEntries = flowHistory.getFlowSequence();
            for (const flowId of commandMatch.flowIds) {
                const handler = this.handlers.get(flowId);
                if (!handler)
                    continue;
                // Check prerequisites before executing
                const prerequisiteCheck = flow_prerequisites_1.FlowPrerequisiteValidator.canExecute(flowId, historyEntries);
                if (!prerequisiteCheck.canExecute) {
                    flowResults.push({
                        flowId,
                        flowName: flowId,
                        status: 'error',
                        message: `Flow prerequisites not met: ${prerequisiteCheck.reason}`,
                        guidance: [`Cannot execute ${flowId}: ${prerequisiteCheck.reason}`],
                        checklist: [],
                        error: prerequisiteCheck.reason,
                    });
                    continue;
                }
                // Check context requirements
                const contextCheck = flow_prerequisites_1.FlowPrerequisiteValidator.validateContextRequirements(flowId, executionContext);
                if (!contextCheck.valid) {
                    flowResults.push({
                        flowId,
                        flowName: flowId,
                        status: 'error',
                        message: `Missing context: ${contextCheck.missing?.join(', ')}`,
                        guidance: [`Context requirements not met: ${contextCheck.missing?.join(', ')}`],
                        checklist: [],
                        error: `Missing: ${contextCheck.missing?.join(', ')}`,
                    });
                    continue;
                }
                if (handler.canExecute(executionContext)) {
                    // Track flow entry in execution chain
                    this.contextManager.addToExecutionChain(flowId, flowId);
                    const result = await handler.execute(executionContext);
                    // Track flow completion and store metadata
                    this.contextManager.completeInChain(flowId, result.status === 'success' ? 'completed' : 'error', result.message);
                    // Store execution metadata in result
                    result.executionMetadata = {
                        executionChain: this.contextManager.getExecutionChain(),
                        executionDuration: this.contextManager.getExecutionDuration(flowId),
                    };
                    this.recordFlowWithMemory(result);
                    flowResults.push(result);
                    if (!detectedFlow) {
                        detectedFlow = {
                            flowId,
                            flowName: result.flowName || flowId,
                            confidence: 1.0
                        };
                    }
                }
            }
            return {
                success: flowResults.some((r) => r.status === 'success'),
                message: `Executed ${commandMatch.command} flow chain (${flowResults.filter((r) => r.status === 'success').length}/${flowResults.length} flows successful)`,
                detectedFlow,
                flowResults,
            };
        }
        // Step 1: Detect intent (falls back to intent detection if not a slash command)
        const detection = this.intentDetector.detect(utterance);
        // Handle no matches
        if (Array.isArray(detection.candidates) && detection.candidates.length === 0) {
            return {
                success: false,
                message: 'Could not understand your request. Please try rephrasing.',
                detectedFlow: null,
                flowResults: [],
            };
        }
        // Handle ambiguous matches
        if (detection.isAmbiguous && !detection.flowId) {
            const candidates = detection.candidates || [];
            return {
                success: false,
                message: 'Your request could match multiple flows. Please clarify.',
                detectedFlow: null,
                flowResults: [],
                ambiguousCandidates: candidates.map((c) => ({
                    flowId: c.flowId,
                    flowName: c.flowName,
                    confidence: c.confidence,
                })),
            };
        }
        // Get the matched flow (either from MatchResult or DisambiguationResult.recommendation)
        const match = detection.flowId
            ? detection
            : detection.recommendation;
        if (!match || !match.flowId) {
            return {
                success: false,
                message: 'Could not determine flow.',
                detectedFlow: null,
                flowResults: [],
            };
        }
        // Prepare execution context (shared across all flows in the chain)
        const executionContext = {
            utterance,
            userId: context.userId,
            projectPath: context.projectPath || process.cwd(),
            currentFile: context.currentFile,
            selectedText: context.selectedText,
            metadata: context.metadata,
        };
        // Execute flow chain: initial flow + any automatically recommended follow-ups
        const flowResults = [];
        const flowHistory = (0, flow_history_1.getFlowHistory)();
        const validator = new deterministic_validator_1.DeterministicValidator();
        const debtTracker = new design_debt_tracker_1.DesignDebtTracker(executionContext.projectPath);
        // CRITICAL: Load and cache project context before Flow A execution
        // All downstream flows depend on register detection and cached design laws
        const contextLoader = new project_context_1.ContextLoader();
        const projectContext = contextLoader.load(executionContext.projectPath);
        executionContext.projectContext = projectContext;
        // Run Flow A to verify brand register and cache design laws
        const flowAHandler = new flow_handler_brand_verify_1.FlowABrandVerifyHandler();
        // Track Flow A execution in context chain
        this.contextManager.addToExecutionChain('flowA_brand_verify', 'Brand/PRODUCT.md Verification');
        const flowAResult = await flowAHandler.execute(executionContext);
        // Complete Flow A in execution chain and store metadata
        this.contextManager.completeInChain('flowA_brand_verify', flowAResult.status === 'success' ? 'completed' : 'error', flowAResult.message);
        flowAResult.executionMetadata = {
            executionChain: this.contextManager.getExecutionChain(),
            executionDuration: this.contextManager.getExecutionDuration('flowA_brand_verify'),
        };
        flowResults.push(flowAResult);
        this.recordFlowWithMemory(flowAResult);
        // If Flow A failed, block the chain (context is mandatory)
        if (flowAResult.status !== 'success') {
            return {
                success: false,
                message: `Cannot proceed: Brand verification failed. ${flowAResult.message}`,
                detectedFlow: { flowId: match.flowId, flowName: match.flowName, confidence: match.confidence },
                flowResults,
            };
        }
        let currentFlowId = match.flowId;
        let firstFlow = true;
        while (currentFlowId) {
            // Get the handler for current flow
            const handler = this.handlers.get(currentFlowId);
            if (!handler) {
                if (firstFlow) {
                    return {
                        success: false,
                        message: `No handler found for flow: ${currentFlowId}`,
                        detectedFlow: { flowId: match.flowId, flowName: match.flowName, confidence: match.confidence },
                        flowResults,
                    };
                }
                break; // Stop chaining if handler not found for follow-up flow
            }
            // Get flow name for error handling
            const flowDef = (0, flows_1.getFlow)(currentFlowId);
            const flowName = flowDef?.name || 'Unknown';
            // Validate real prerequisites (DeterministicValidator: hard gates)
            const validation = validator.validate(currentFlowId, executionContext, flowHistory);
            // Auto-log warning violations as design debt (DesignDebtTracker)
            if (currentFlowId) {
                const flowIdForDebt = currentFlowId; // Type guard for TS
                validation.violations.forEach((violation) => {
                    if (violation.severity === 'warning' && violation.debtCandidate) {
                        debtTracker.addDebt({
                            ...violation.debtCandidate,
                            flowId: flowIdForDebt,
                        });
                    }
                });
            }
            if (!validation.valid) {
                // Prerequisites not met: skip this flow and stop chaining
                const skipResult = {
                    flowId: currentFlowId,
                    flowName,
                    status: 'skipped',
                    message: validation.message,
                };
                flowResults.push(skipResult);
                // Record skipped flow with violations
                flowHistory.recordFlow({
                    flowId: currentFlowId,
                    flowName,
                    status: 'skipped',
                    message: validation.message,
                    guidance: validation.violations.map((v) => `[${v.severity}] ${v.message}${v.fix ? ` - ${v.fix}` : ''}`),
                });
                break; // Stop chaining when prerequisites not met
            }
            // Check if handler can execute (revive canExecute validation)
            if (!handler.canExecute(executionContext)) {
                const skipResult = {
                    flowId: currentFlowId,
                    flowName,
                    status: 'skipped',
                    message: `Flow cannot execute: prerequisites not met for ${currentFlowId}`,
                };
                flowResults.push(skipResult);
                flowHistory.recordFlow({
                    flowId: currentFlowId,
                    flowName,
                    status: 'skipped',
                    message: skipResult.message,
                });
                break;
            }
            // Execute handler with context tracking
            let result;
            const enhancedContext = flow_execution_context_enhanced_1.EnhancedContextManager.createEnhancedContext(executionContext, currentFlowId, flowName);
            // Track flow entry in execution chain
            this.contextManager.addToExecutionChain(currentFlowId, flowName);
            try {
                // Execute the handler
                result = await handler.execute(executionContext);
                // Track flow completion in execution chain
                this.contextManager.completeInChain(currentFlowId, result.status === 'success' ? 'completed' : 'error', result.message);
            }
            catch (error) {
                result = {
                    flowId: currentFlowId,
                    flowName,
                    status: 'error',
                    message: `Error executing flow: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    error: error instanceof Error ? error.message : String(error),
                };
                // Track error in execution chain
                this.contextManager.completeInChain(currentFlowId, 'error', result.message);
            }
            // Store execution metadata in result (both success and error paths)
            result.executionMetadata = {
                enhancedContext,
                executionChain: this.contextManager.getExecutionChain(),
                executionDuration: this.contextManager.getExecutionDuration(currentFlowId),
            };
            // Apply domain validators if configured for this flow (soft-fail: log but continue)
            const validatorsForFlow = (0, flow_domain_validators_1.getValidatorsForFlow)(currentFlowId);
            if (validatorsForFlow.length > 0 && result.status === 'success') {
                const validations = this.compositionEngine.validateMultipleDomains(validatorsForFlow, result);
                result.validationResults = validations;
                // Log any validation failures as warnings (soft-fail mode)
                const failedValidations = validations.filter(v => v.status !== 'pass');
                if (failedValidations.length > 0) {
                    const warningMsg = failedValidations
                        .map(v => `[${v.domain}] ${v.failedRules.join(', ')}`)
                        .join('; ');
                    result.message = `${result.message}\n\nValidation warnings: ${warningMsg}`;
                }
            }
            // Check for regressions (RegressionDetector: compare against prior runs)
            const regressionDetector = new regression_detector_1.RegressionDetector();
            const regression = regressionDetector.compare(currentFlowId, result, flowHistory);
            if (regression.hasRegression) {
                const blockingRegressions = regression.regressions.filter((r) => r.severity === 'blocking');
                const warningRegressions = regression.regressions.filter((r) => r.severity === 'warning');
                if (blockingRegressions.length > 0) {
                    // Status regression: block the chain
                    result.status = 'error';
                    result.message = `${result.message}\n\n⚠️ REGRESSION DETECTED: ${regression.message}`;
                    // Break the chain on blocking regression
                    this.recordFlowWithMemory(result);
                    flowResults.push(result);
                    currentFlowId = undefined; // Stop chaining
                    break;
                }
                else if (warningRegressions.length > 0) {
                    // Guidance/checklist drops: warn but continue
                    const warningMessages = warningRegressions.map((w) => w.message).join('; ');
                    result.message = `${result.message}\n\n⚠️ Warning: ${warningMessages}`;
                }
            }
            // Record to FlowHistory (with memory data if available)
            this.recordFlowWithMemory(result);
            flowResults.push(result);
            // Determine next flow: if current flow succeeded, ask orchestrator for recommendation
            if (result.status === 'success') {
                currentFlowId = this.orchestrator.getNextRecommendedFlow(currentFlowId, result);
            }
            else if (result.status === 'needs_input' || result.status === 'error') {
                // Stop chaining on error or incomplete flow
                currentFlowId = undefined;
            }
            else {
                currentFlowId = undefined;
            }
            firstFlow = false;
        }
        // Build response with all flow results
        const combinedMessage = flowResults.map((r) => `[Flow: ${r.flowName}]\n${r.message}`).join('\n\n---\n\n');
        // Prepend open design debt summary if any (DesignDebtTracker session start)
        const debtSummary = debtTracker.getSummary();
        const finalMessage = debtSummary ? `${debtSummary}\n\n---\n\n${combinedMessage}` : combinedMessage;
        // Persist session memory for all executed flows
        (0, session_memory_writer_1.persistSessionMemory)(executionContext.projectPath);
        return {
            success: flowResults.some((r) => r.status === 'success'),
            message: finalMessage,
            detectedFlow: { flowId: match.flowId, flowName: match.flowName, confidence: match.confidence },
            flowResults,
            guidance: flowResults.flatMap((r) => r.guidance || []),
            checklist: flowResults.flatMap((r) => r.checklist || []),
            artifacts: flowResults.flatMap((r) => r.artifacts || []),
        };
    }
    showInteractiveMenu(context) {
        const byPhase = (0, slash_command_router_1.getCommandsByPhase)();
        const menuItems = [];
        let itemNum = 1;
        const commandMap = {};
        menuItems.push('\n=== Sidecoach Interactive Menu ===\n');
        for (const phase of ['Research', 'Implement', 'Review', 'Special']) {
            const phaseCommands = byPhase[phase]?.commands || [];
            if (phaseCommands.length > 0) {
                menuItems.push(`\n[${phase} Phase]\n`);
                for (const cmd of phaseCommands) {
                    menuItems.push(`  ${itemNum}. /sidecoach ${cmd.command}`);
                    menuItems.push(`     ${cmd.description}`);
                    commandMap[itemNum] = cmd.command;
                    itemNum++;
                }
            }
        }
        menuItems.push('\n\nEnter a number (1-' + (itemNum - 1) + ') to execute that command.');
        menuItems.push('Or type: /sidecoach <command> [options]');
        menuItems.push('Or type: /sidecoach list to see commands grouped by phase');
        return {
            success: true,
            message: 'Sidecoach - Interactive Design Flow Engine',
            detectedFlow: null,
            flowResults: [],
            guidance: menuItems,
        };
    }
    registerHandler(handler) {
        this.handlers.set(handler.flowId, handler);
    }
    getAvailableFlows() {
        const flowIds = [
            // Tier 1: Strategy/Research
            'flowA_brand_verify',
            'flowB_component_research',
            'flowC_font_research',
            'flowD_reference_inspiration',
            'flowE_motion_patterns',
            // Tier 2: Execution
            'flowF_design_tokens',
            'flowG_component_implementation',
            'flowH_motion_integration',
            'flowI_accessibility',
            // Tier 3: Polish/QA
            'flowJ_tactical_polish',
            'flowK_multi_lens_audit',
            'flowL_design_critique',
            'flowM_responsive_validation',
            'flowN_rapid_iteration_refined',
            // Tier 4: Special
            'flowO_clone_match_special',
            'flowP_constraint_design_special',
            'flowQ_migration_special',
            // Tier 5: Specialized Refinement
            'flowR_layout_optimization',
            'flowS_typography_excellence',
            'flowT_ambitious_motion',
            // Special: Curate & QA
            'flowU_curate',
            'flowV_all_seven_qa',
            // Legacy flows
            'flow1_clone_match',
            'flow2_polish_enhance',
            'flow3_audit_page',
            'flow4_explore_discovery',
            'flow5_review_qa',
            'flow6_constraint_design',
            'flow7_design_component',
            'flow8_refactor_layout',
            'flow9_accessible',
            'flow10_implement_design',
            'flow11_extract_tokens',
            'flow12_responsive_review',
            'flow13_rapid_iteration',
            'flow14_migration',
        ];
        return flowIds
            .map((flowId) => {
            const flow = (0, flows_1.getFlow)(flowId);
            return flow
                ? {
                    flowId,
                    name: flow.name,
                    description: flow.description,
                }
                : null;
        })
            .filter((f) => f !== null);
    }
}
exports.FlowExecutionEngine = FlowExecutionEngine;
function createExecutionEngine() {
    return new FlowExecutionEngine();
}
//# sourceMappingURL=sidecoach-orchestrator.js.map