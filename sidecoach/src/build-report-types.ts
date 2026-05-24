// Build Report type definitions + grading helpers.
// Pure - no I/O. Imported by the aggregator and the orchestrator.

export type ShipVerdict = 'clean' | 'warnings-only' | 'blocked';
export type LetterGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface SeverityCounts {
  blocking: number;
  warning: number;
  info: number;
}

export interface DomainGrade {
  domain: string;
  passRate: number;
  letter: LetterGrade;
  rulesPassed: number;
  rulesTotal: number;
}

export interface FindingEntry {
  severity: 'blocking' | 'warning' | 'info';
  source: string;
  flowId: string;
  rule: string;
  message: string;
  fix?: string;
}

export interface BuildReport {
  reportId: string;
  generatedAt: string;
  composite?: string;
  flowsExecuted: string[];
  verdict: ShipVerdict;
  severityCounts: SeverityCounts;
  overallGrade: LetterGrade;
  overallPassRate: number;
  domainGrades: DomainGrade[];
  findings: FindingEntry[];
  nextSteps: string[];
}

export interface GradingThresholds {
  a: number;
  b: number;
  c: number;
  d: number;
}

export const DEFAULT_THRESHOLDS: GradingThresholds = { a: 90, b: 80, c: 70, d: 60 };

export function passRateToLetter(
  passRate: number,
  thresholds: GradingThresholds = DEFAULT_THRESHOLDS
): LetterGrade {
  if (passRate >= thresholds.a) return 'A';
  if (passRate >= thresholds.b) return 'B';
  if (passRate >= thresholds.c) return 'C';
  if (passRate >= thresholds.d) return 'D';
  return 'F';
}

export function computeOverallGrade(
  domains: DomainGrade[],
  thresholds: GradingThresholds = DEFAULT_THRESHOLDS
): { passRate: number; letter: LetterGrade } {
  if (domains.length === 0) {
    return { passRate: 0, letter: 'F' };
  }
  const sum = domains.reduce((acc, d) => acc + d.passRate, 0);
  const passRate = sum / domains.length;
  return { passRate, letter: passRateToLetter(passRate, thresholds) };
}

export function computeVerdict(counts: SeverityCounts): ShipVerdict {
  if (counts.blocking > 0) return 'blocked';
  if (counts.warning > 0) return 'warnings-only';
  return 'clean';
}
