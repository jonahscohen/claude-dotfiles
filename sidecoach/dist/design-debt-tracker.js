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
exports.DesignDebtTracker = void 0;
exports.createDebtTracker = createDebtTracker;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Tracks design debt at the project level
 * Stored at: ~/.claude/sidecoach-design-debt.json
 * Keyed by: projectPath (same as FlowHistory v2)
 */
class DesignDebtTracker {
    constructor(projectPath) {
        this.projectPath = projectPath || process.cwd();
        this.debtFile = path.join(process.env.HOME || '~', '.claude', 'sidecoach-design-debt.json');
        this.debt = new Map();
        this.load();
    }
    /**
     * Load debt from disk
     */
    load() {
        try {
            if (fs.existsSync(this.debtFile)) {
                const data = fs.readFileSync(this.debtFile, 'utf-8');
                const parsed = JSON.parse(data);
                for (const [key, value] of Object.entries(parsed)) {
                    this.debt.set(key, value);
                }
            }
        }
        catch (error) {
            // File doesn't exist or is corrupted, start fresh
            this.debt.clear();
        }
    }
    /**
     * Save debt to disk
     */
    save() {
        try {
            const dir = path.dirname(this.debtFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const data = Object.fromEntries(this.debt);
            fs.writeFileSync(this.debtFile, JSON.stringify(data, null, 2), 'utf-8');
        }
        catch (error) {
            console.error('Failed to save design debt:', error);
        }
    }
    /**
     * Get or create project debt list
     */
    getProjectDebt() {
        if (!this.debt.has(this.projectPath)) {
            this.debt.set(this.projectPath, []);
        }
        return this.debt.get(this.projectPath);
    }
    /**
     * Generate unique ID for debt
     */
    generateId() {
        return `debt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }
    /**
     * Add a debt entry
     */
    addDebt(debtItem) {
        const projectDebt = this.getProjectDebt();
        const debt = {
            ...debtItem,
            id: this.generateId(),
            createdAt: new Date().toISOString(),
        };
        projectDebt.push(debt);
        this.save();
        return debt;
    }
    /**
     * Resolve a debt entry (mark as complete)
     */
    resolveDebt(id) {
        const projectDebt = this.getProjectDebt();
        const debt = projectDebt.find((d) => d.id === id);
        if (debt) {
            debt.resolvedAt = new Date().toISOString();
            this.save();
        }
    }
    /**
     * Get all open (unresolved) debt for this project
     */
    getOpenDebt() {
        const projectDebt = this.getProjectDebt();
        return projectDebt.filter((d) => !d.resolvedAt);
    }
    /**
     * Get summary of open debt (one-liner for session start)
     */
    getSummary() {
        const openDebt = this.getOpenDebt();
        if (openDebt.length === 0) {
            return '';
        }
        const descriptions = openDebt.slice(0, 3).map((d) => `${d.description}`);
        const suffix = openDebt.length > 3 ? `, +${openDebt.length - 3} more` : '';
        return `⚠️ ${openDebt.length} open design debt item${openDebt.length > 1 ? 's' : ''}: ${descriptions.join(', ')}${suffix}`;
    }
    /**
     * Get all debt (open and resolved) for this project
     */
    getAllDebt() {
        return this.getProjectDebt();
    }
    /**
     * Remove a debt entry
     */
    removeDebt(id) {
        const projectDebt = this.getProjectDebt();
        const index = projectDebt.findIndex((d) => d.id === id);
        if (index >= 0) {
            projectDebt.splice(index, 1);
            this.save();
        }
    }
}
exports.DesignDebtTracker = DesignDebtTracker;
function createDebtTracker(projectPath) {
    return new DesignDebtTracker(projectPath);
}
//# sourceMappingURL=design-debt-tracker.js.map