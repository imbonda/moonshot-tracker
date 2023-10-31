// 3rd party.
import NodeCache from 'node-cache';
// Internal.
import type { ERC20 } from '../../@types/web3';

export class MonitorCache {
    private newERC20Cache: NodeCache;

    private newLPTokenCache: NodeCache;

    constructor() {
        this.newERC20Cache = new NodeCache();
        this.newLPTokenCache = new NodeCache();
    }

    public saveNewERC20(erc20: ERC20, ttl: number): void {
        this.newERC20Cache.set(erc20.address, erc20, ttl);
    }

    public saveNewLPToken(address: string, ttl: number): void {
        this.newLPTokenCache.set(address, 1, ttl);
    }

    public getNewERC20(address: string): ERC20 | null {
        return this.newERC20Cache.get<ERC20>(address) ?? null;
    }

    public isNewLPToken(address: string): boolean {
        return !!this.newLPTokenCache.get(address);
    }
}
