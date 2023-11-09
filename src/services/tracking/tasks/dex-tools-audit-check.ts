// Internal.
import { scraper } from '../../../lib/scraping/dex-tools/scraper';
import type { TokenInsights } from '../../../lib/scraping/dex-tools/types';
import { TaskExecutor } from '../executors/task';

export class DEXToolsAuditCheck extends TaskExecutor {
    private dexToolsInsight?: { dextools: TokenInsights};

    protected async run(): Promise<void> {
        const { chainId } = this.token;
        const tokenAddress = this.token.address;

        const result = await scraper.fetchTokenInsights(chainId, tokenAddress);

        if (result) {
            this.dexToolsInsight = {
                dextools: result,
            };
        }

        // TODO: check out the audit-scan matrix ('Honeypot', 'Sell Tax', 'Owner Percent', etc.)
    }

    public get insight(): Record<string, unknown> {
        if (!this.dexToolsInsight) {
            return super.insight;
        }
        return this.dexToolsInsight;
    }
}
