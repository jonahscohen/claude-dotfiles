import * as fs from 'fs';
import * as path from 'path';
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
export class DesignDebtTracker {
  private debtFile: string;
  private projectPath: string;
  private debt: Map<string, DesignDebt[]>;

  constructor(projectPath?: string) {
    this.projectPath = projectPath || process.cwd();
    this.debtFile = path.join(process.env.HOME || '~', '.claude', 'sidecoach-design-debt.json');
    this.debt = new Map();
    this.load();
  }

  /**
   * Load debt from disk
   */
  private load(): void {
    try {
      if (fs.existsSync(this.debtFile)) {
        const data = fs.readFileSync(this.debtFile, 'utf-8');
        const parsed = JSON.parse(data);
        for (const [key, value] of Object.entries(parsed)) {
          this.debt.set(key, value as DesignDebt[]);
        }
      }
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
      this.debt.clear();
    }
  }

  /**
   * Save debt to disk
   */
  private save(): void {
    try {
      const dir = path.dirname(this.debtFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = Object.fromEntries(this.debt);
      fs.writeFileSync(this.debtFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save design debt:', error);
    }
  }

  /**
   * Get or create project debt list
   */
  private getProjectDebt(): DesignDebt[] {
    if (!this.debt.has(this.projectPath)) {
      this.debt.set(this.projectPath, []);
    }
    return this.debt.get(this.projectPath)!;
  }

  /**
   * Generate unique ID for debt
   */
  private generateId(): string {
    return `debt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Add a debt entry
   */
  addDebt(debtItem: Omit<DesignDebt, 'id' | 'createdAt'>): DesignDebt {
    const projectDebt = this.getProjectDebt();
    const debt: DesignDebt = {
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
  resolveDebt(id: string): void {
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
  getOpenDebt(): DesignDebt[] {
    const projectDebt = this.getProjectDebt();
    return projectDebt.filter((d) => !d.resolvedAt);
  }

  /**
   * Get summary of open debt (one-liner for session start)
   */
  getSummary(): string {
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
  getAllDebt(): DesignDebt[] {
    return this.getProjectDebt();
  }

  /**
   * Remove a debt entry
   */
  removeDebt(id: string): void {
    const projectDebt = this.getProjectDebt();
    const index = projectDebt.findIndex((d) => d.id === id);
    if (index >= 0) {
      projectDebt.splice(index, 1);
      this.save();
    }
  }
}

export function createDebtTracker(projectPath?: string): DesignDebtTracker {
  return new DesignDebtTracker(projectPath);
}
