// Internal.
import type {
    FullyAuditedPairData, PairData,
    TokenInsights,
    TokenPairResponse, TopTokenPairsResponse,
} from '../../../@types/dex-tools';
import { Logger } from '../../logger';
import { Browser, type Page } from '../browser';
import {
    buildGetPairUrl, buildGetTopTokenPairsUrl, parseTokenPair,
} from './utils';

export { AudicCheck, AUDIT_CHECKS } from './utils';

const DEX_TOOLS_URL = 'https://www.dextools.io';
const LANDING_URL = `${DEX_TOOLS_URL}/app/en/pairs`;
const PAIR_EXPLORER_URL = `${DEX_TOOLS_URL}/app/en/ether/pair-explorer`;

class DexToolsScraper {
    private browser!: Browser;

    private page!: Page;

    private reqInit!: RequestInit;

    private logger: Logger;

    constructor() {
        this.logger = new Logger(this.constructor.name);
    }

    public async fetchTokenInsights(
        chainId: number,
        tokenAddress: string,
    ): Promise<TokenInsights | null> {
        try {
            await this.setup();
            const topPair = await this.fetchTopTokenPair(tokenAddress);
            const auditedPair = topPair
                ? await this.fetchTokenPair(chainId, topPair.id.pair)
                : null;
            const insights = auditedPair
                ? this.createTokenInsights(auditedPair)
                : null;
            return insights;
        } finally {
            await this.browser?.close();
        }
    }

    protected async setup(): Promise<void> {
        this.setupBrowser();
        await this.setupPage();
    }

    protected setupBrowser(): void {
        if (!this.browser || this.browser.closed) {
            this.browser = new Browser();
        }
    }

    protected async setupPage(): Promise<void> {
        this.page = await this.browser.getPage(this.constructor.name);

        if (this.page.url() !== LANDING_URL) {
            const landing = await this.page.goto(LANDING_URL, {
                // wait for website to load
                waitUntil: 'load',
            });
            const headers = landing?.request().headers() ?? {};
            this.reqInit = {
                headers: {
                    accept: 'application/json',
                    'accept-language': 'en-US,en;q=0.9',
                    'content-type': 'application/json',
                    'sec-ch-ua': headers['sec-ch-ua'],
                    'sec-ch-ua-mobile': headers['sec-ch-ua-mobile'],
                    'sec-ch-ua-platform': headers['sec-ch-ua-platform'],
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                },
                referrer: LANDING_URL,
                referrerPolicy: 'strict-origin-when-cross-origin',
                body: null,
                method: 'GET',
                mode: 'cors',
                credentials: 'include',
            };
        }
    }

    private async fetchTopTokenPair(
        tokenAddress: string,
    ): Promise<PairData | null> {
        const url = buildGetTopTokenPairsUrl(tokenAddress);
        const response = await this.fetchDexTools<TopTokenPairsResponse>(url);
        const [rawTopPair] = response?.results ?? [];
        if (!rawTopPair) {
            this.logger.warn('Failed to fetch token pairs', { token: tokenAddress });
            return null;
        }
        const parsed = parseTokenPair(rawTopPair);
        return parsed;
    }

    private async fetchTokenPair(
        chainId: number,
        pairAddress: string,
    ): Promise<FullyAuditedPairData | null> {
        const url = buildGetPairUrl(chainId, pairAddress);
        const response = await this.fetchDexTools<TokenPairResponse>(url);
        const [rawPair] = response?.data ?? [];
        if (!rawPair) {
            this.logger.warn('Failed to fetch token pair', { chainId, pair: pairAddress });
            return null;
        }
        const parsed = parseTokenPair(rawPair) as FullyAuditedPairData;
        return parsed;
    }

    private async fetchDexTools<T>(
        url: string,
    ): Promise<T> {
        const result = await this.page.evaluate(async (reqUrl, reqInit) => new Promise(
            (resolve) => {
                fetch(reqUrl, reqInit).then((res) => resolve(res.json()));
            },
        ), url, this.reqInit) as T;
        return result;
    }

    // eslint-disable-next-line class-methods-use-this
    private createTokenInsights(data: FullyAuditedPairData): TokenInsights {
        return {
            audit: data.token.audit,
            metrics: data.token.metrics,
            links: data.token.links,
            properties: {
                decimals: data.token.decimals,
                symbol: data.token.symbol,
                name: data.token.name,
            },
            topPair: {
                dextScore: data.dextScore,
                metrics: data.metrics,
                votes: data.votes,
                fee: data.fee,
                swaps: data.swaps,
                price: data.price,
                volume: data.volume,
                url: `${PAIR_EXPLORER_URL}/${data.id.pair}`,
            },
        };
    }
}

export const scraper = new DexToolsScraper();
