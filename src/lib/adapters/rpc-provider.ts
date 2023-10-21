/* eslint-disable max-classes-per-file */
// 3rd party.
import axios from 'axios';
import { JsonRpcProvider, TransactionReceipt } from 'ethers';
// Internal.
import { web3Config } from '../../config';

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
        this.chainId = chainId;
        this._provider = this.getProvider(this.endpoints[rotatingProviderIndex]);
        rotatingProviderIndex = (rotatingProviderIndex + 1) % this.endpoints.length;
        return new Proxy(this, this.handler);
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

    public async getTransactionReceipts(blockNumber: string): Promise<TransactionReceipt[] | null> {
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
