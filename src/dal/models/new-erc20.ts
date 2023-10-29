// Internal.
import type { ERC20 } from '../../@types/web3';
import { BaseDalModule } from './base';

const ERC20_TAG = 'erc20';

export class NewERC20Model extends BaseDalModule {
    public async saveNewERC20(erc20: ERC20, ttl: number): Promise<void> {
        const key = NewERC20Model.buildERC20Uid(erc20.chainId, erc20.address);
        const value = erc20;
        const options = {
            ttlSeconds: ttl,
            serialize: true,
        };
        await this.dal.redis.set(key, value, options);
    }

    public async findNewERC20(chainId: number, address: string): Promise<ERC20 | null> {
        const key = NewERC20Model.buildERC20Uid(chainId, address);
        const options = {
            deserialize: true,
        };
        return this.dal.redis.get(key, options);
    }

    private static buildERC20Uid(chainId: number, address: string): string {
        return `${chainId}.${address}.${ERC20_TAG}`;
    }
}
