// Internal.
import type { AuditMatrix, RedFlags, RiskLevel } from './dex-tools';

export interface DexToolsAuditInsights {
    auditMatrix: AuditMatrix,
    redFlags: RedFlags,
}

export interface CredibilityInsights {
    riskLevel: RiskLevel,
}
