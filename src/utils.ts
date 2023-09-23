import { JsonRpcProvider } from 'ethers';
import { Chains, PROVIDERS } from './constants';

export function constructAvaliableChains() {
    return Object.keys(PROVIDERS).filter(
        (chain) => (PROVIDERS[chain as Chains]?.length ?? 0) > 0,
    ) as Chains[];
}

export function constructAvaliableProviders() {
    return Object.keys(PROVIDERS).reduce((acc, chain) => {
        if (PROVIDERS[chain as Chains]) {
            acc[chain as Chains] = PROVIDERS[chain as Chains]!.map(
                (provider) => new JsonRpcProvider(provider),
            );
        }
        return acc;
    }, {} as Record<Chains, JsonRpcProvider[]>);
}
