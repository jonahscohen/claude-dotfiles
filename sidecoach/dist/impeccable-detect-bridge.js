"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImpeccableDetectBridge = void 0;
exports.createDetectBridge = createDetectBridge;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
/**
 * Bridge to `npx impeccable detect` CLI
 * Runs the 28-rule static analyzer on project HTML/CSS
 * Fails gracefully if tool unavailable
 */
class ImpeccableDetectBridge {
    /**
     * Run impeccable detect on project and return findings
     */
    detect(projectPath) {
        try {
            // Check if project has HTML/CSS files worth analyzing
            if (!this.hasWebFiles(projectPath)) {
                return {
                    success: true,
                    findings: [],
                    message: 'No HTML/CSS files detected in project - skipping impeccable detect',
                    rulesCovered: 0,
                };
            }
            // Run impeccable detect with JSON output
            const output = (0, child_process_1.execFileSync)('npx', ['impeccable', 'detect', projectPath, '--json'], {
                timeout: 30000,
                stdio: ['pipe', 'pipe', 'pipe'],
                encoding: 'utf-8',
            });
            // Parse JSON output
            const parsed = JSON.parse(output);
            // Transform to our findings format
            const findings = [];
            // Handle different output formats
            if (Array.isArray(parsed)) {
                // Array of findings
                findings.push(...parsed.map(this.transformFinding));
            }
            else if (parsed.findings && Array.isArray(parsed.findings)) {
                // Object with findings array
                findings.push(...parsed.findings.map(this.transformFinding));
            }
            else if (parsed.results && Array.isArray(parsed.results)) {
                // Alternative format
                findings.push(...parsed.results.map(this.transformFinding));
            }
            const criticalCount = findings.filter((f) => f.severity === 'critical').length;
            const highCount = findings.filter((f) => f.severity === 'high').length;
            const message = findings.length > 0
                ? `Impeccable detect found ${findings.length} issues: ${criticalCount} critical, ${highCount} high`
                : 'No anti-pattern violations detected';
            return {
                success: true,
                findings,
                message,
                rulesCovered: 28, // Impeccable has 28 rules
            };
        }
        catch (error) {
            // Tool unavailable, timeout, or parse error
            const isTimeout = error instanceof Error && error.message.includes('timed out');
            const isToolMissing = error instanceof Error && error.message.includes('not found');
            if (isToolMissing) {
                return {
                    success: true,
                    findings: [],
                    message: 'Impeccable detect tool not available (npx impeccable not installed)',
                    rulesCovered: 0,
                };
            }
            if (isTimeout) {
                return {
                    success: true,
                    findings: [],
                    message: 'Impeccable detect timed out (>30s) - too many files',
                    rulesCovered: 0,
                };
            }
            return {
                success: true,
                findings: [],
                message: `Impeccable detect error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                rulesCovered: 0,
            };
        }
    }
    /**
     * Check if project has HTML/CSS files to analyze
     */
    hasWebFiles(projectPath) {
        try {
            // Look for common web file patterns
            const files = fs.readdirSync(projectPath, { recursive: true });
            const hasWeb = files.some((f) => /\.(html|css|jsx?|tsx?)$/i.test(f) && !f.includes('node_modules'));
            return hasWeb;
        }
        catch {
            return true; // Assume yes if can't read directory
        }
    }
    /**
     * Transform impeccable output to our finding format
     */
    transformFinding(rawFinding) {
        return {
            rule: rawFinding.rule || rawFinding.code || 'unknown',
            severity: (rawFinding.severity || rawFinding.level || 'low').toLowerCase(),
            message: rawFinding.message || rawFinding.description || 'Unknown issue',
            file: rawFinding.file || rawFinding.path,
            line: rawFinding.line || rawFinding.lineNumber,
            column: rawFinding.column || rawFinding.columnNumber,
            selector: rawFinding.selector || rawFinding.css,
            fix: rawFinding.fix || rawFinding.suggestion,
        };
    }
    /**
     * Convert findings to guidance items for flow output
     */
    findingsToGuidance(findings) {
        return findings
            .sort((a, b) => {
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        })
            .slice(0, 20) // Top 20 findings
            .map((f) => `[${f.severity.toUpperCase()}] ${f.message}${f.file ? ` in ${f.file}` : ''}${f.fix ? ` → ${f.fix}` : ''}`);
    }
}
exports.ImpeccableDetectBridge = ImpeccableDetectBridge;
function createDetectBridge() {
    return new ImpeccableDetectBridge();
}
//# sourceMappingURL=impeccable-detect-bridge.js.map