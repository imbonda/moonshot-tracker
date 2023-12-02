// Internal.
import { BaseDalModule } from './base';

const ERC20_TAG = 'erc20';

export class MatureERC20Model extends BaseDalModule {
    public async saveERC20(chainId: number, address: string, ttl: number): Promise<void> {
        const key = MatureERC20Model.buildERC20Uid(chainId, address);
        const value = true;
        const options = {
            ttlSeconds: ttl,
            serialize: true,
        };
        await this.dal.redis.set(key, value, options);
    }

    public async isERC20(chainId: number, address: string): Promise<boolean> {
        const key = MatureERC20Model.buildERC20Uid(chainId, address);
        const options = {
            deserialize: true,
        };
        return !!await this.dal.redis.get(key, options);
    }

    private static buildERC20Uid(chainId: number, address: string): string {
        return `${ERC20_TAG}:${chainId}:${address}`;
    }
}
