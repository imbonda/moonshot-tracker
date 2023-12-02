/* eslint-disable max-classes-per-file */
// 3rd party.
import axios from 'axios';
import Bottleneck from 'bottleneck';
import {
    Contract, JsonRpcProvider, TransactionReceipt,
} from 'ethers';
import { BackOffPolicy, Retryable } from 'typescript-retry-decorator';
// Internal.
import type { UnknownFunction } from '../../@types/general';
import type { ERC20 } from '../../@types/web3';
import erc20ABI from '../../abi/erc20.json';
import { web3Config } from '../../config';
import { HEX_NONE, MS_IN_SECOND } from '../constants';
import { wrapRpcError } from '../decorators';
import { isRetryableError } from '../errors';

interface ProviderConfig {
    endpoints: string[],
    avgBlockTime: number,
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

    #proxyFuncCache: Map<string, UnknownFunction>;

    #proxy;

    private handler = {
        get(target: Web3RpcProvider, prop: string, receiver: unknown) {
            return target.proxy(prop, receiver);
        },
    };

    private proxy(prop: string, _receiver: unknown) {
        const reflectedValue = this._provider[prop as keyof JsonRpcProvider];
        const selfValue = this[prop as keyof Web3RpcProvider];

        let value: unknown = selfValue;
        let bindTarget = this as JsonRpcProvider;
        if (!value) {
            value = reflectedValue;
            bindTarget = this._provider;
        }

        if (typeof value === 'function') {
            if (this.#proxyFuncCache.has(prop)) {
                return this.#proxyFuncCache.get(prop);
            }

            value = value.bind(bindTarget);
            if (!NO_RETRY_METHODS.has(prop)) {
                const original = value as UnknownFunction;
                value = (...args: unknown[]) => (
                    this.withRetry(original, ...args)
                );
            }
            this.#proxyFuncCache.set(prop, value as UnknownFunction);
        }

        return value;
    }

    /**
     * Used for wrapping every provider functions with a retryable decorator.
     * Note that we retry only for appropriate errors.
     */
    // eslint-disable-next-line class-methods-use-this
    @Retryable({
        maxAttempts: 10,
        backOff: 100,
        backOffPolicy: BackOffPolicy.ExponentialBackOffPolicy,
        exponentialOption: {
            maxInterval: 500,
            multiplier: 2,
        },
        doRetry: isRetryableError,
    })
    @wrapRpcError
    private withRetry<T extends unknown[], R>(func: (...args: T) => R, ...args: T): R {
        return func(...args);
    }

    constructor(chainId: number) {
        super();
        this.chainId = chainId;
        this._provider = this.getProvider(this.endpoints[rotatingProviderIndex]);
        this._nextReqId = 1;
        rotatingProviderIndex = (rotatingProviderIndex + 1) % this.endpoints.length;
        this.#proxyFuncCache = new Map();
        this.#proxy = new Proxy(this, this.handler);
        this.setRatelimit();
        return this.#proxy;
    }

    public get config(): ProviderConfig {
        return web3Config.RPC_CONFIG_BY_CHAIN[this.chainId];
    }

    public get endpoints(): string[] {
        return this.config.endpoints;
    }

    public get avgBlockTime(): number {
        return this.config.avgBlockTime;
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
        this.#proxy.call = new Bottleneck({
            maxConcurrent: 1,
            minTime: MS_IN_SECOND / 3,
        }).wrap(this.#proxy.call.bind(this.#proxy));

        this.send<unknown> = new Bottleneck({
            maxConcurrent: 1,
            minTime: MS_IN_SECOND / 3,
        }).wrap(this.send.bind(this));

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

    public async isContract(
        address: string,
        blockNumber: string = 'latest',
    ): Promise<boolean> {
        const result = await this.send(
            'eth_getCode',
            [address, blockNumber],
        );
        return result !== HEX_NONE;
    }

    public async getERC20(address: string): Promise<ERC20 | null> {
        const contract = new Contract(
            address,
            erc20ABI,
            this.#proxy,
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
        return this.send(
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

    public async send<T>(
        method: string,
        params: unknown[],
    ): Promise<T> {
        const res = await this._provider.send(method, params);
        if (!res) {
            throw new Error('Empty response');
        }
        return res;
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
