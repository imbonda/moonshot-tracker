// 3rd party.
import type { Log, TransactionReceipt } from 'ethers';
// Internal.
import type { ERC20 } from '../../../@types/web3';
import { dal } from '../../../dal';
import { createTrackedToken } from '../../../templates/tracked-token';
import {
    LP_V2_FACTORIES, LP_V3_FACTORIES,
    uniswapV2FactoryInterface, uniswapV3FactoryInterface,
} from '../uniswap-utils/constants';
import {
    parsePairAddress, parsePoolAddress, parseTokenAddresses,
} from '../uniswap-utils/utils';
import { BaseProcessor } from './base';

export class LPTokenReceiptProcessor extends BaseProcessor {
    public async processReceipt(receipt: TransactionReceipt): Promise<void> {
        await this.processLogs(receipt);
    }

    protected async processLog(log: Log): Promise<void> {
        await Promise.all([
            this.processUniswapV2LPTokenCreation(log),
            this.processUniswapV3LPTokenCreation(log),
        ]);
    }

    private async processUniswapV2LPTokenCreation(log: Log): Promise<void> {
        const isV2factory = LP_V2_FACTORIES.has(log.address.toLowerCase());
        const parsed = isV2factory && uniswapV2FactoryInterface.parseLog(log as never);
        if (!parsed) {
            return;
        }
        const [token1Addr, token2Addr] = parseTokenAddresses(log);
        const pair = parsePairAddress(log);
        const [token1, token2] = await Promise.all([
            this.getNewERC20(token1Addr),
            this.getNewERC20(token2Addr),
        ]);
        const newToken = token1 || token2;
        this.logger.info('Liquidity pair created', { pair, newToken: !!newToken });
        if (newToken) {
            await this.saveTrackedToken(newToken.address);
            await this.deleteNewERC20(newToken.address);
        }
    }

    private async processUniswapV3LPTokenCreation(log: Log): Promise<void> {
        const isV3factory = LP_V3_FACTORIES.has(log.address.toLowerCase());
        const parsed = isV3factory && uniswapV3FactoryInterface.parseLog(log as never);
        if (!parsed) {
            return;
        }
        const [token1Addr, token2Addr] = parseTokenAddresses(log);
        const pool = parsePoolAddress(log);
        const [token1, token2] = await Promise.all([
            this.getNewERC20(token1Addr),
            this.getNewERC20(token2Addr),
        ]);
        const newToken = token1 || token2;
        this.logger.info('Liquidity pool created', { pool, newToken: !!newToken });
        if (newToken) {
            await this.saveTrackedToken(newToken.address);
            await this.deleteNewERC20(newToken.address);
        }
    }

    private async getNewERC20(address: string): Promise<ERC20 | null> {
        // TODO: consider adding fallback to rpc (check if exists X blocks ago).
        const cached = this.cache.getNewERC20(address);
        const saved = !cached && await dal.models.newErc20.findNewERC20(
            this.chainId,
            address,
        );
        return cached || saved || null;
    }

    private async saveTrackedToken(address: string): Promise<void> {
        const trackedToken = createTrackedToken(this.chainId, address);
        await dal.models.trackedToken.upsertTrackedToken(trackedToken);
    }

    private async deleteNewERC20(address: string): Promise<void> {
        await dal.models.newErc20.deleteNewERC20(this.chainId, address);
        this.cache.deleteNewERC20(address);
    }
}
