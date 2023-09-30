// 3rd party.
import { JsonRpcProvider } from 'ethers';
// Internal.
import { web3Config } from '../../config';

export class Web3RpcProvider {
    private providers: JsonRpcProvider[];

    private rotatingProviderIndex: number;

    constructor(chainId: number) {
        this.providers = web3Config.RPC_ENDPOINTS_BY_CHAIN[chainId].map(
            (endpoint: string) => new JsonRpcProvider(endpoint),
        );
        this.rotatingProviderIndex = 0;
    }

    alloc(): JsonRpcProvider {
        const provider = this.providers[this.rotatingProviderIndex];
        this.rotatingProviderIndex = (this.rotatingProviderIndex + 1) % this.providers.length;
        return provider;
    }
}
