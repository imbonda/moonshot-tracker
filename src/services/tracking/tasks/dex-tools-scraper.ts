// Internal.
import type { DexToolsTokenInsights } from '../../../@types/dex-tools';
import { scraper } from '../../../lib/scraping/dex-tools/scraper';
import { type InsightsKey, type TaskInsights, TaskExecutor } from '../executors/task';

export class DEXToolsScraper extends TaskExecutor {
    private tokenInsights?: DexToolsTokenInsights;

    protected async run(): Promise<void> {
        const { chainId } = this.token;
        const tokenAddress = this.token.address;

        const result = await scraper.fetchTokenInsights(chainId, tokenAddress);

        if (!result) {
            return;
        }

        this.tokenInsights = result;
        // Setting task state to be completed so that the pipeline can continue.
        // This task should be a daemon so it can continue scraping until halting/aborting.
        this.setCompleted();
    }

    // eslint-disable-next-line class-methods-use-this
    public get insightsKey(): InsightsKey {
        return 'dextools';
    }

    public get insights(): TaskInsights {
        if (!this.tokenInsights) {
            return super.insights;
        }
        return {
            [this.insightsKey]: this.tokenInsights,
        };
    }
}
