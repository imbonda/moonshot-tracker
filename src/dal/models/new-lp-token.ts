// Internal.
import { BaseDalModule } from './base';

const LP_TOKEN_TAG = 'lptoken';

export class NewLPTokenModel extends BaseDalModule {
    public async saveNewLPToken(chainId: number, address: string, ttl: number): Promise<void> {
        const key = NewLPTokenModel.buildLPTokenUid(chainId, address);
        const value = true;
        const options = {
            ttlSeconds: ttl,
        };
        await this.dal.redis.set(key, value, options);
    }

    public async isNewLPToken(chainId: number, address: string): Promise<boolean> {
        const key = NewLPTokenModel.buildLPTokenUid(chainId, address);
        return !!this.dal.redis.get(key);
    }

    private static buildLPTokenUid(chainId: number, address: string): string {
        return `${chainId}.${address}.${LP_TOKEN_TAG}`;
    }
}
