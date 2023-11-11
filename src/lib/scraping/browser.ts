// 3rd party.
import type { Browser as PBrowser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
// Internal.
import { safe } from '../decorators';
import { Logger } from '../logger';

export type { Page } from 'puppeteer';

// Disguise bot to pass bot security checks (https://bot.sannysoft.com/)
puppeteer.use(stealthPlugin());

export class Browser {
    private browser!: PBrowser;

    private pagesById: Record<string, Page>;

    private logger: Logger;

    private _closed: boolean;

    constructor() {
        this.pagesById = {};
        this._closed = false;
        this.logger = new Logger(this.constructor.name);
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
        return this.browser.newPage();
    }

    private async launch(): Promise<void> {
        this.logger.info('Opening browser');
        this.browser = await puppeteer.launch({
            headless: 'new',
            defaultViewport: null,
        });
    }

    @safe()
    public async close() {
        if (!this.closed) {
            this.logger.info('Closing browser');
            this.closed = true;
            await this.browser.close();
        }
    }
}
