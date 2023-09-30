// Internal.
import { BaseDalModule } from './base';

const NEW_ERC20_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days.

export class NewERC20Module extends BaseDalModule {
    public async saveNewERC20(chainId: number, address: string): Promise<void> {
        const key = NewERC20Module.buildERC20uid(chainId, address);
        const value = true;
        const options = {
            ttlSeconds: NEW_ERC20_TTL_SECONDS,
        };
        await this.dal.redis.setData(key, value, options);
    }

    public async isNewERC20(chainId: number, address: string): Promise<boolean> {
        const key = NewERC20Module.buildERC20uid(chainId, address);
        return !!this.dal.redis.getData(key);
    }

    private static buildERC20uid(chainId: number, address: string): string {
        return `${chainId}.${address}`;
    }
}
