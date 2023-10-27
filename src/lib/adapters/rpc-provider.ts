/* eslint-disable max-classes-per-file */
// 3rd party.
import axios from 'axios';
import Bottleneck from 'bottleneck';
import { Contract, JsonRpcProvider, TransactionReceipt } from 'ethers';
// Internal.
import erc20ABI from '../../abi/erc20.json';
import { web3Config } from '../../config';
import { MS_IN_SECOND } from '../constants';

let rotatingProviderIndex = 0;
const providers: Record<string, JsonRpcProvider> = {};

const JsonRpcProviderClass = (): new () => JsonRpcProvider => (class {} as never);

export class Web3RpcProvider extends JsonRpcProviderClass() {
    private chainId: number;

    private _provider: JsonRpcProvider;

    private handler = {
        get(target: Web3RpcProvider, prop: string, receiver: unknown) {
            const value = Reflect.get(target._provider, prop, receiver);
            if (!value) {
                return target[prop as keyof Web3RpcProvider];
            }
            if (typeof value === 'function') {
                return value.bind(target._provider);
            }
            return value;
        },
    };

    constructor(chainId: number) {
        super();
        this.setRatelimit();
        this.chainId = chainId;
        this._provider = this.getProvider(this.endpoints[rotatingProviderIndex]);
        rotatingProviderIndex = (rotatingProviderIndex + 1) % this.endpoints.length;
        return new Proxy(this, this.handler);
    }

    /**
     * Instance specific rate-limiting, rather than class specific (via a decorator).
     */
    private setRatelimit() {
        this.isERC20 = new Bottleneck({
            maxConcurrent: 1,
            minTime: MS_IN_SECOND / 3,
        }).wrap(this.isERC20.bind(this));

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

    public get config(): { endpoints: string[], pollingInterval: number } {
        return web3Config.RPC_CONFIG_BY_CHAIN[this.chainId];
    }

    public get endpoints(): string[] {
        return this.config.endpoints;
    }

    public get pollingInterval(): number {
        return this.config.pollingInterval;
    }

    public async isERC20(address: string): Promise<boolean> {
        const contract = new Contract(
            address,
            erc20ABI,
            this,
        );

        try {
            const symbol = await contract.symbol();
            return !!symbol;
        } catch (err) {
            // Not an ERC-20 token.
            return false;
        }
    }

    public async getTransactionReceipts(blockNumber: string): Promise<TransactionReceipt[] | null> {
        return this.getTransactionReceiptsAlchemy(blockNumber);
    }

    private async getTransactionReceiptsAlchemy(
        blockNumber: string,
    ): Promise<TransactionReceipt[] | null> {
        const result = await this.sendNoBatch<{receipts: TransactionReceipt[]} | null>(
            'alchemy_getTransactionReceipts',
            [{ blockNumber }],
        );
        return result?.receipts ?? null;
    }

    private async sendNoBatch<T>(
        method: string,
        params: Record<string, unknown>[],
    ): Promise<T | null> {
        const { url } = this._provider._getConnection();
        const body = JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
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
        return result?.data?.result ?? null;
    }
}
