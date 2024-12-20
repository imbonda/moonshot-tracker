// Internal.
import type { DexToolsTokenInsights, RiskLevel } from '../../../@types/dex-tools';
import type { DexToolsAuditInsights } from '../../../@types/insights';
import { AudicCheck } from '../../../lib/scraping/dex-tools/utils';
import { ContextExecutor } from '../executors/context';
import { InsightsKey, TaskExecutor, TaskInsights } from '../executors/task';
import { TaskId } from '../static';

type CredibilityCheckConfig = {
    lockedOrBurnedLiquidityThreshold: number,
    ownershipPercentThreshold: number,
    scoreThreshold: number,
};

export class CredibilityCheck extends TaskExecutor {
    private riskLevel?: RiskLevel;

    protected async run(context: ContextExecutor): Promise<void> {
        const [dexToolsInsights, auditInsights] = await Promise.all([
            context.getLatestTaskInsightsUnwrapped(TaskId.DEX_TOOLS_SCRAPER),
            context.getLatestTaskInsightsUnwrapped(TaskId.AUDIT_CHECK),
        ]) as [DexToolsTokenInsights, DexToolsAuditInsights];

        const isDexToolsScraperActive = context.isTaskActive(TaskId.DEX_TOOLS_SCRAPER);
        const isAuditActive = context.isTaskActive(TaskId.AUDIT_CHECK);
        if (!isDexToolsScraperActive || !isAuditActive) {
            this.halt();
            return;
        }

        this.setRiskLevel(auditInsights);

        const isCredibleCommunity = this.isCredibleCommunity(dexToolsInsights);
        const isCredibleLiquidity = this.isEnoughLiquidityLockedOrBurned(dexToolsInsights);
        const isCredibleOwnership = this.isDistributedOwnership(auditInsights);
        const isCredibleScore = this.isCredibleScore(dexToolsInsights);
        const isCredible = isCredibleCommunity
                        && isCredibleLiquidity
                        && isCredibleOwnership
                        && isCredibleScore;
        if (isCredible) {
            this.setCompleted();
        }
    }

    private setRiskLevel(insights?: DexToolsAuditInsights | null): void {
        const RISK_LEVEL_TO_VALUE = {
            low: 0,
            medium: 1,
            high: 2,
        };
        const riskLevels = insights?.auditMatrix?.riskLevel;
        const highestRiskLevel = Object.values(riskLevels || {}).reduce((highest, level) => {
            if (!highest) {
                return level;
            }
            const highestValue = RISK_LEVEL_TO_VALUE[highest as keyof typeof RISK_LEVEL_TO_VALUE];
            const value = RISK_LEVEL_TO_VALUE[level as keyof typeof RISK_LEVEL_TO_VALUE];
            return value > highestValue
                ? level
                : highest;
        }, undefined);
        this.riskLevel = highestRiskLevel;
    }

    // eslint-disable-next-line class-methods-use-this
    private isCredibleCommunity(insights: DexToolsTokenInsights | null): boolean {
        return !!insights?.links?.telegram;
    }

    private isEnoughLiquidityLockedOrBurned(insights?: DexToolsTokenInsights | null): boolean {
        const tokensnifferAudit = insights?.audit?.external?.tokensniffer;
        const lockedOrBurnedPercent = tokensnifferAudit?.liquidity_locked_or_burned_percent || 0;
        return lockedOrBurnedPercent >= this.lockedOrBurnedLiquidityThreshold;
    }

    private isDistributedOwnership(insights?: DexToolsAuditInsights | null): boolean {
        const threshold = this.ownershipPercentThreshold;
        const ownershipAuditChecks = [AudicCheck.OWNER_PERCENT, AudicCheck.CREATOR_PERCENT];
        return !ownershipAuditChecks.some((check) => {
            const audits = insights?.auditMatrix?.[check];
            const alertingAuditValues = Object.values(audits || {})
                .filter((audit) => audit >= threshold);
            return alertingAuditValues.length > 0;
        });
    }

    private isCredibleScore(insights?: DexToolsTokenInsights | null): boolean {
        const { total: dextScore } = insights?.topPair.dextScore || {};
        const isCredibleScore = dextScore! >= this.scoreThreshold;
        return isCredibleScore;
    }

    private get lockedOrBurnedLiquidityThreshold(): number {
        const defaultValue = 0.8;
        const threshold = (this.config as CredibilityCheckConfig)?.lockedOrBurnedLiquidityThreshold;
        return threshold || defaultValue;
    }

    // eslint-disable-next-line class-methods-use-this
    private get ownershipPercentThreshold(): number {
        const defaultValue = 0.05;
        const threshold = (this.config as CredibilityCheckConfig)?.ownershipPercentThreshold;
        return threshold || defaultValue;
    }

    private get scoreThreshold(): number {
        const defaultValue = 70;
        const threshold = (this.config as CredibilityCheckConfig)?.scoreThreshold;
        return threshold || defaultValue;
    }

    // eslint-disable-next-line class-methods-use-this
    public get insightsKey(): InsightsKey {
        return 'credibility';
    }

    public get insights(): TaskInsights {
        const { riskLevel } = this;
        return {
            [this.insightsKey]: {
                riskLevel,
            },
        };
    }
}
