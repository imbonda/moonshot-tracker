// Internal.
import type { DexToolsTokenInsights } from '../../../@types/dex-tools';
import { ContextExecutor } from '../executors/context';
import { TaskExecutor } from '../executors/task';
import { TaskId } from '../static';

type CredibilityCheckConfig = {
    lockedOrBurnedLiquidityThreshold: number,
    scoreThreshold: number,
};

export class CredibilityCheck extends TaskExecutor {
    protected async run(context: ContextExecutor): Promise<void> {
        const dexToolsScraperTaskId = TaskId.DEX_TOOLS_SCRAPER;
        const dexToolsInsights = await context.getLatestTaskInsightsUnwrapped(
            dexToolsScraperTaskId,
        ) as DexToolsTokenInsights;
        const isDexToolsScraperActive = context.isTaskActive(dexToolsScraperTaskId);
        if (!isDexToolsScraperActive) {
            this.halt();
            return;
        }

        const isCredibleCommunity = this.isCredibleCommunity(dexToolsInsights);
        const isCredibleLiquidity = this.isEnoughLiquidityLockedOrBurned(dexToolsInsights);
        const isCredibleScore = this.isCredibleScore(dexToolsInsights);
        const isCredible = isCredibleCommunity && isCredibleLiquidity && isCredibleScore;
        if (isCredible) {
            this.setCompleted();
        }
    }

    // eslint-disable-next-line class-methods-use-this
    private isCredibleCommunity(insights: DexToolsTokenInsights | null): boolean {
        return !!insights?.links?.telegram;
    }

    private isEnoughLiquidityLockedOrBurned(insights?: DexToolsTokenInsights | null): boolean {
        const tokensnifferAudit = insights?.audit?.external?.tokensniffer;
        const lockedOrBurnedPercent = tokensnifferAudit?.liquidity_locked_or_burned_percent ?? 0;
        return lockedOrBurnedPercent >= this.lockedOrBurnedLiquidityThreshold;
    }

    private isCredibleScore(insights?: DexToolsTokenInsights | null): boolean {
        const { total: dextScore } = insights?.topPair.dextScore ?? {};
        const isCredibleScore = dextScore! >= this.scoreThreshold;
        return isCredibleScore;
    }

    private get lockedOrBurnedLiquidityThreshold(): number {
        const threshold = (this.config as CredibilityCheckConfig)?.lockedOrBurnedLiquidityThreshold;
        return threshold ?? 0;
    }

    private get scoreThreshold(): number {
        const threshold = (this.config as CredibilityCheckConfig)?.scoreThreshold;
        return threshold ?? 0;
    }
}
