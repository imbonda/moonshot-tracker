// 3rd party.
import NodeCache from 'node-cache';

export class MonitorCache {
    private erc20Cache: NodeCache;

    constructor() {
        this.erc20Cache = new NodeCache();
    }

    public saveERC20(address: string, ttl: number): void {
        this.erc20Cache.set(address, true, ttl);
    }

    public isERC20(address: string): boolean {
        return this.erc20Cache.get<boolean>(address) || false;
    }
}
