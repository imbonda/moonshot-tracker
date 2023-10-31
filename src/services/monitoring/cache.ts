// 3rd party.
import NodeCache from 'node-cache';
// Internal.
import type { ERC20 } from '../../@types/web3';

export class MonitorCache {
    private newERC20Cache: NodeCache;

    private newLPTokenCache: NodeCache;

    constructor(ttlERC20: number, ttlLPToken: number) {
        this.newERC20Cache = new NodeCache({ stdTTL: ttlERC20 });
        this.newLPTokenCache = new NodeCache({ stdTTL: ttlLPToken });
    }

    public saveNewERC20(erc20: ERC20): void {
        this.newERC20Cache.set(erc20.address, erc20);
    }

    public saveNewLPToken(address: string): void {
        this.newLPTokenCache.set(address, 1);
    }

    public getNewERC20(address: string): ERC20 | null {
        return this.newERC20Cache.get<ERC20>(address) ?? null;
    }

    public isNewLPToken(address: string): boolean {
        return !!this.newLPTokenCache.get(address);
    }
}
