// Internal.
import { BaseDalModule } from './base';

export class NewERC20Model extends BaseDalModule {
    public async saveNewERC20(chainId: number, address: string, ttl: number): Promise<void> {
        const key = NewERC20Model.buildERC20uid(chainId, address);
        const value = true;
        const options = {
            ttlSeconds: ttl,
        };
        await this.dal.redis.set(key, value, options);
    }

    public async isNewERC20(chainId: number, address: string): Promise<boolean> {
        const key = NewERC20Model.buildERC20uid(chainId, address);
        return !!this.dal.redis.get(key);
    }

    private static buildERC20uid(chainId: number, address: string): string {
        return `${chainId}.${address}`;
    }
}
