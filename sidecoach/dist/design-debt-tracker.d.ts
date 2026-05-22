import { FlowId } from './types';
export interface DesignDebt {
    id: string;
    flowId: FlowId;
    description: string;
    justification: string;
    dueWhen: string;
    estimatedCost: 'low' | 'medium' | 'high';
    createdAt: string;
    resolvedAt?: string;
}
/**
 * Tracks design debt at the project level
 * Stored at: ~/.claude/sidecoach-design-debt.json
 * Keyed by: projectPath (same as FlowHistory v2)
 */
export declare class DesignDebtTracker {
    private debtFile;
    private projectPath;
    private debt;
    constructor(projectPath?: string);
    /**
     * Load debt from disk
     */
    private load;
    /**
     * Save debt to disk
     */
    private save;
    /**
     * Get or create project debt list
     */
    private getProjectDebt;
    /**
     * Generate unique ID for debt
     */
    private generateId;
    /**
     * Add a debt entry
     */
    addDebt(debtItem: Omit<DesignDebt, 'id' | 'createdAt'>): DesignDebt;
    /**
     * Resolve a debt entry (mark as complete)
     */
    resolveDebt(id: string): void;
    /**
     * Get all open (unresolved) debt for this project
     */
    getOpenDebt(): DesignDebt[];
    /**
     * Get summary of open debt (one-liner for session start)
     */
    getSummary(): string;
    /**
     * Get all debt (open and resolved) for this project
     */
    getAllDebt(): DesignDebt[];
    /**
     * Remove a debt entry
     */
    removeDebt(id: string): void;
}
export declare function createDebtTracker(projectPath?: string): DesignDebtTracker;
//# sourceMappingURL=design-debt-tracker.d.ts.map