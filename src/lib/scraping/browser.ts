// 3rd party.
import type { Browser as PBrowser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
// Internal.
import { safe } from '../decorators';
import { Logger } from '../logger';
import { tracer, type Tracer } from './static';

export type { Page } from 'puppeteer';

// Disguise bot to pass bot security checks (https://bot.sannysoft.com/)
puppeteer.use(stealthPlugin());

export class Browser {
    private browser!: PBrowser;

    private pagesById: Record<string, Page>;

    private logger: Logger;

    private tracer: Tracer;

    private _closed: boolean;

    constructor() {
        this.pagesById = {};
        this._closed = false;
        this.logger = new Logger(this.constructor.name);
        this.tracer = tracer;
    }

    public get closed(): boolean {
        return this._closed;
    }

    private set closed(val: boolean) {
        this._closed = val;
    }

    public async getPage(id: string): Promise<Page> {
        this.pagesById[id] ??= await this.newPage();
        const page = this.pagesById[id];
        return page;
    }

    private async newPage(): Promise<Page> {
        if (!this.browser) {
            await this.launch();
        }
        return this.tracer.startActiveSpan(`${this.constructor.name}.newPage`, async (span) => {
            try {
                return await this.browser.newPage();
            } finally {
                span.end();
            }
        });
    }

    private async launch(): Promise<void> {
        await this.tracer.startActiveSpan(`${this.constructor.name}.launch`, async (span) => {
            try {
                this.logger.info('Opening browser');
                this.browser = await puppeteer.launch({
                    headless: 'new',
                    defaultViewport: null,
                    args: [
                        // Enabling chrome to render large pages within docker:
                        // https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#tips
                        '--disable-dev-shm-usage',
                    ],
                });
            } finally {
                span.end();
            }
        });
    }

    @safe()
    public async close() {
        if (!this.closed) {
            await this.tracer.startActiveSpan(`${this.constructor.name}.close`, async (span) => {
                try {
                    this.logger.info('Closing browser');
                    this.closed = true;
                    await this.browser?.close();
                } finally {
                    span.end();
                }
            });
        }
    }
}
