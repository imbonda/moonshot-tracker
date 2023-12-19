// 3rd party.
import type { TransactionReceipt } from 'ethers';
// Internal.
import { web3Config } from '../../config';
import { promiselimit, safe, throttle } from '../../lib/decorators';
import { dal } from '../../dal';
import { Web3RpcProvider } from '../../lib/adapters/rpc-provider';
import { hexifyNumber } from '../../lib/utils';
import { Service } from '../service';
import { MonitorCache } from './cache';
import { LPTokenReceiptProcessor } from './receipt-processors/lp-token-processor';

const MAX_CONCURRENT_PROCESSED_RECEIPTS = 50;

export class BlockchainMonitor extends Service {
    private chainId: number;

    private provider: Web3RpcProvider;

    private cache: MonitorCache;

    private lpTokenProcessor: LPTokenReceiptProcessor;

    private nextExpectedBlock?: number;

    constructor() {
        super();
        this.chainId = web3Config.CHAIN_ID;
        this.provider = new Web3RpcProvider(this.chainId);
        this.cache = new MonitorCache();
        this.lpTokenProcessor = new LPTokenReceiptProcessor(this.provider, this.cache);
    }

    // eslint-disable-next-line class-methods-use-this
    public async setup(): Promise<void> {
        await dal.connect();
    }

    // eslint-disable-next-line class-methods-use-this
    public async teardown(): Promise<void> {
        await dal.disconnect();
    }

    public async start(): Promise<void> {
        this.monitor();
    }

    private monitor(): void {
        this.provider.on('block', this.newBlockHandler.bind(this));
    }

    @safe({ silent: true })
    @throttle({ maxConcurrent: 1, queueSize: 0 })
    private async newBlockHandler(blockNumber: number): Promise<void> {
        this.nextExpectedBlock ??= blockNumber;
        if (blockNumber < this.nextExpectedBlock) {
            this.logger.warn('Duplicate block event, possible reorg', { blockNumber });
            this.nextExpectedBlock = blockNumber;
        }

        // Handling blocks by order and taking care of gaps that can occur.
        for (; this.nextExpectedBlock <= blockNumber; this.nextExpectedBlock += 1) {
            // eslint-disable-next-line no-await-in-loop
            await this.tracer.startActiveSpan('block', { root: true }, async (span) => {
                try {
                    span.setAttributes({ 'monitor.block': this.nextExpectedBlock });
                    this.logger.info('Starting handling block', { blockNumber: this.nextExpectedBlock });
                    await this.processBlock(this.nextExpectedBlock!);
                } finally {
                    span.end();
                    this.logger.info('Finished handling block', { blockNumber: this.nextExpectedBlock });
                }
            });
        }
    }

    @safe()
    private async processBlock(blockNumber: number): Promise<void> {
        const hexBlockNumber = hexifyNumber(blockNumber);
        const receipts = await this.provider.getTransactionReceipts(hexBlockNumber);
        // TODO: consider handling blocks that we failed to query.
        if (!receipts) {
            this.logger.warn('No receipts', { blockNumber });
            return;
        }

        await Promise.all(
            receipts.map(this.processReceipt.bind(this)),
        );
    }

    @promiselimit(MAX_CONCURRENT_PROCESSED_RECEIPTS)
    private async processReceipt(receipt: TransactionReceipt): Promise<void> {
        await this.lpTokenProcessor.processReceipt(receipt);
    }
}
