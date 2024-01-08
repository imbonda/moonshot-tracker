// 3rd party.
import type { BigNumberish, Log, TransactionReceipt } from 'ethers';
// Internal.
import { dal } from '../../../dal';
import { MS_IN_SECOND } from '../../../lib/constants';
import { calcBlockNumber } from '../../../lib/utils';
import { createTrackedToken } from '../../../templates/tracked-token';
import {
    LP_V2_FACTORIES, LP_V3_FACTORIES,
    uniswapV2FactoryInterface, uniswapV3FactoryInterface,
} from '../uniswap-utils/constants';
import {
    parsePairAddress, parsePoolAddress, parseTokenAddresses,
} from '../uniswap-utils/utils';
import { BaseProcessor } from './base';

const ERC20_MATURITY_THRESHOLD_SECONDS = 7 * 24 * 60 * 60; // 7 days.

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
        const pair = parsePairAddress(log);
        await this.processNewLP(pair, log);
    }

    private async processUniswapV3LPTokenCreation(log: Log): Promise<void> {
        const isV3factory = LP_V3_FACTORIES.has(log.address.toLowerCase());
        const parsed = isV3factory && uniswapV3FactoryInterface.parseLog(log as never);
        if (!parsed) {
            return;
        }
        const pool = parsePoolAddress(log);
        await this.processNewLP(pool, log);
    }

    private async processNewLP(lp: string, log: Log): Promise<void> {
        const [token1Addr, token2Addr] = parseTokenAddresses(log);
        const [isNewToken1, isNewToken2] = await Promise.all([
            this.isNewERC20(token1Addr, log.blockNumber),
            this.isNewERC20(token2Addr, log.blockNumber),
        ]);
        let newTokenAddr = isNewToken1 ? token1Addr : undefined;
        newTokenAddr ||= isNewToken2 ? token2Addr : undefined;
        this.logger.info('LP created', { lp, newToken: !!newTokenAddr });
        if (newTokenAddr) {
            this.logger.info('Saving token for tracking', { token: newTokenAddr });
            await this.saveTrackedToken(newTokenAddr);
            await this.saveTokenCache(newTokenAddr);
        }
    }

    private async isNewERC20(address: string, currentBlockNumber: BigNumberish): Promise<boolean> {
        const cached = this.cache.isERC20(address);
        const saved = !cached && await dal.models.matureERC20.isERC20(this.chainId, address);
        const isMatureERC20 = cached || saved;
        if (isMatureERC20 && !cached) {
            // Cache db data.
            await this.saveTokenCache(address, false);
        }
        if (isMatureERC20) {
            return false;
        }
        const { avgBlockTime } = this.provider;
        const blocksOffset = ERC20_MATURITY_THRESHOLD_SECONDS / (avgBlockTime / MS_IN_SECOND);
        const offset = -blocksOffset;
        const oldBlockNumber = calcBlockNumber(currentBlockNumber, offset);
        const isMatureContract = await this.provider.isContract(address, oldBlockNumber);
        if (isMatureContract) {
            // Cache mature tokens (e.g. WETH).
            await this.saveTokenCache(address, false);
        }
        return !isMatureContract;
    }

    private async saveTokenCache(address: string, persist: boolean = true): Promise<void> {
        const ttl = ERC20_MATURITY_THRESHOLD_SECONDS;
        this.cache.saveERC20(address, ttl);
        if (persist) {
            await dal.models.matureERC20.saveERC20(this.chainId, address, ttl);
        }
    }

    private async saveTrackedToken(address: string): Promise<void> {
        const trackedToken = createTrackedToken(this.chainId, address);
        await dal.models.trackedToken.saveTrackedToken(trackedToken);
    }
}
