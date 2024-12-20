// 3rd party.
import type { Log, TransactionReceipt } from 'ethers';
// Internal.
import type { Web3RpcProvider } from '../../../lib/adapters/rpc-provider';
import { Logger } from '../../../lib/logger';
import { MonitorCache } from '../cache';

export abstract class BaseProcessor {
    protected provider: Web3RpcProvider;

    protected cache: MonitorCache;

    protected logger: Logger;

    constructor(provider: Web3RpcProvider, cache: MonitorCache) {
        this.provider = provider;
        this.cache = cache;
        this.logger = new Logger(this.constructor.name);
    }

    protected get chainId(): number {
        return this.provider.chainId;
    }

    public abstract processReceipt(receipt: TransactionReceipt): Promise<void>;

    protected async processLogs(receipt: TransactionReceipt): Promise<void> {
        const results = await Promise.allSettled(
            receipt.logs.map(this.processLog.bind(this)),
        );
        results
            .filter((result) => result.status === 'rejected')
            .map((rejected) => this.logger.error((rejected as PromiseRejectedResult).reason));
    }

    protected abstract processLog(log: Log): Promise<void>;
}
