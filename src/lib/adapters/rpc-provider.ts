/* eslint-disable max-classes-per-file */
// 3rd party.
import axios from 'axios';
import Bottleneck from 'bottleneck';
import {
    Contract, JsonRpcProvider, TransactionReceipt,
} from 'ethers';
import { Retryable } from 'typescript-retry-decorator';
// Internal.
import type { ERC20 } from '../../@types/web3';
import erc20ABI from '../../abi/erc20.json';
import { web3Config } from '../../config';
import { MS_IN_SECOND } from '../constants';
import { wrapRpcError } from '../decorators';
import { isRetryableError } from '../errors';

interface ProviderConfig {
    endpoints: string[],
    pollingInterval: number,
    isAlchemy: boolean,
}

let rotatingProviderIndex = 0;
const providers: Record<string, JsonRpcProvider> = {};

const NO_RETRY_METHODS = new Set(['on']);

const JsonRpcProviderClass = (): new () => JsonRpcProvider => (class {} as never);

export class Web3RpcProvider extends JsonRpcProviderClass() {
    public chainId: number;

    private _provider: JsonRpcProvider;

    private _nextReqId: number;

    private handler = {
        get(target: Web3RpcProvider, prop: string, receiver: unknown) {
            return target.proxy(prop, receiver);
        },
    };

    private proxy(prop: string, receiver: unknown) {
        const reflectedValue = Reflect.get(this._provider, prop, receiver);
        const selfValue = this[prop as keyof Web3RpcProvider];

        let value = reflectedValue;
        let bindTarget = this._provider;
        if (!value) {
            value = selfValue;
            bindTarget = this as JsonRpcProvider;
        }

        if (typeof reflectedValue === 'function') {
            value = reflectedValue.bind(bindTarget);
        }

        if (typeof value === 'function' && !NO_RETRY_METHODS.has(prop)) {
            const original = value;
            value = (...args: unknown[]) => (
                this.withRetry(original.bind(bindTarget), ...args)
            );
        }

        return value;
    }

    /**
     * Used for wrapping every provider functions with a retryable decorator.
     * Note that we retry only for appropriate errors.
     */
    // eslint-disable-next-line class-methods-use-this
    @Retryable({
        maxAttempts: 3,
        backOff: 100,
        doRetry: isRetryableError,
    })
    @wrapRpcError
    private withRetry<T extends unknown[], R>(func: (...args: T) => R, ...args: T): R {
        return func(...args);
    }

    constructor(chainId: number) {
        super();
        this.setRatelimit();
        this.chainId = chainId;
        this._provider = this.getProvider(this.endpoints[rotatingProviderIndex]);
        this._nextReqId = 1;
        rotatingProviderIndex = (rotatingProviderIndex + 1) % this.endpoints.length;
        return new Proxy(this, this.handler);
    }

    public get config(): ProviderConfig {
        return web3Config.RPC_CONFIG_BY_CHAIN[this.chainId];
    }

    public get endpoints(): string[] {
        return this.config.endpoints;
    }

    public get pollingInterval(): number {
        return this.config.pollingInterval;
    }

    public get isAlchemy(): boolean {
        return this.config.isAlchemy;
    }

    private get nextId(): string {
        const id = `i${this._nextReqId}`;
        this._nextReqId = (this._nextReqId + 1) % 1000;
        return id;
    }

    /**
     * Instance specific rate-limiting, rather than class specific (via a decorator).
     */
    private setRatelimit() {
        this.getERC20 = new Bottleneck({
            maxConcurrent: 1,
            minTime: MS_IN_SECOND / 3,
        }).wrap(this.getERC20.bind(this));

        this.getTransactionReceiptsAlchemy = new Bottleneck({
            maxConcurrent: 1,
            minTime: 1 * MS_IN_SECOND,
        }).wrap(this.getTransactionReceiptsAlchemy.bind(this));
    }

    private getProvider(endpoint: string) {
        const provider = providers[endpoint] ?? new JsonRpcProvider(endpoint, this.chainId);
        provider.pollingInterval = this.pollingInterval;
        providers[endpoint] = provider;
        return provider;
    }

    public async getERC20(address: string): Promise<ERC20 | null> {
        const contract = new Contract(
            address,
            erc20ABI,
            this,
        );

        try {
            const { chainId } = this;
            const [symbol, decimals, totalSupply] = await Promise.all([
                contract.symbol(),
                contract.decimals(),
                contract.totalSupply(),
            ]);
            const isValidERC20 = !!symbol && !!decimals && !!totalSupply;
            if (isValidERC20) {
                return {
                    chainId,
                    address,
                    symbol,
                    decimals,
                    totalSupply,
                };
            }
            return null;
        } catch (err) {
            // Not an ERC-20 token.
            return null;
        }
    }

    public async getTransactionReceipts(blockNumber: string): Promise<TransactionReceipt[] | null> {
        if (this.isAlchemy) {
            return this.getTransactionReceiptsAlchemy(blockNumber);
        }
        return this._provider.send(
            'eth_getBlockReceipts',
            [blockNumber],
        );
    }

    private async getTransactionReceiptsAlchemy(
        blockNumber: string,
    ): Promise<TransactionReceipt[] | null> {
        const result = await this.sendNoBatch<{ receipts: TransactionReceipt[] } | null>(
            'alchemy_getTransactionReceipts',
            [{ blockNumber }],
        );
        return result?.receipts ?? null;
    }

    private async sendNoBatch<T>(
        method: string,
        params: unknown[],
    ): Promise<T | null> {
        const { url } = this._provider._getConnection();
        const body = JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
            id: this.nextId,
        });

        const result = await axios.post(
            url,
            body,
            {
                headers: {
                    'Content-Type': 'application/json;',
                },
            },
        );

        const error = result?.data?.error;
        if (error) {
            throw new Error(error.message);
        }

        return result?.data?.result ?? null;
    }
}
