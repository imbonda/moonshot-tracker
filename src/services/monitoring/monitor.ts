// 3rd party.
import type { TransactionReceipt } from 'ethers';
// Internal.
import { web3Config } from '../../config';
import { safe } from '../../lib/decorators';
import { dal } from '../../dal/dal';
import { Web3RpcProvider } from '../../lib/adapters/rpc-provider';
import { hexifyNumber } from '../../lib/utils';
import { Service } from '../service';
import { MonitorCache } from './cache';
import { ERC20ReceiptProcessor } from './receipt-processors/erc20-processor';
import { LPTokenReceiptProcessor } from './receipt-processors/lp-token-processor';

export class BlockchainMonitor extends Service {
    private chainId: number;

    private provider: Web3RpcProvider;

    private cache: MonitorCache;

    private erc20Processor: ERC20ReceiptProcessor;

    private lpTokenProcessor: LPTokenReceiptProcessor;

    constructor() {
        super();
        this.chainId = web3Config.CHAIN_ID;
        this.provider = new Web3RpcProvider(this.chainId);
        this.cache = new MonitorCache();
        this.erc20Processor = new ERC20ReceiptProcessor(this.provider, this.cache);
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
        this.provider.on('block', this.processBlock.bind(this));
    }

    @safe()
    private async processBlock(blockNumber: number) {
        // TODO: Handle skipped blocks.
        this.logger.info('Starting handling block', { blockNumber });
        const hexBlockNumber = hexifyNumber(blockNumber);
        const receipts = await this.provider.getTransactionReceipts(hexBlockNumber);
        // TODO: Consider handling blocks that we failed to query.
        if (!receipts) {
            return;
        }

        await Promise.all(
            receipts.map(this.processReceipt.bind(this)),
        );
        this.logger.info('Finished handling block', { blockNumber });
    }

    private async processReceipt(receipt: TransactionReceipt): Promise<void> {
        await Promise.allSettled([
            this.erc20Processor.processReceipt(receipt),
            this.lpTokenProcessor.processReceipt(receipt),
        ]);
    }
}
