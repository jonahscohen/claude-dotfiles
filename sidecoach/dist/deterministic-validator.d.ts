import { FlowId } from './types';
import { FlowExecutionContext } from './flow-handler';
import { FlowHistory } from './flow-history';
export interface ValidationViolation {
    rule: string;
    severity: 'blocking' | 'warning';
    message: string;
    fix?: string;
    debtCandidate?: {
        description: string;
        justification: string;
        dueWhen: string;
        estimatedCost: 'low' | 'medium' | 'high';
    };
}
export interface ValidationResult {
    valid: boolean;
    violations: ValidationViolation[];
    message: string;
}
export declare class DeterministicValidator {
    validate(flowId: FlowId, context: FlowExecutionContext, history: FlowHistory): ValidationResult;
}
export declare function createValidator(): DeterministicValidator;
//# sourceMappingURL=deterministic-validator.d.ts.map