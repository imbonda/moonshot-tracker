// 3rd party.
import type { Log, TransactionReceipt } from 'ethers';
// Internal.
import type { ERC20 } from '../../@types/web3';
import { web3Config } from '../../config';
import { safe } from '../../lib/decorators';
import { dal } from '../../dal/dal';
import { Web3RpcProvider } from '../../lib/adapters/rpc-provider';
import { hexifyNumber } from '../../lib/utils';
import { Service } from '../service';
import {
    DEAD_ADDRESSES,
    LP_V2_FACTORIES, LP_V3_FACTORIES,
    uniswapV2FactoryInterface, uniswapV3FactoryInterface,
} from './uniswap-utils/constants';
import {
    parsePairAddress, parsePoolAddress, parseTokenAddresses, parseTransfer,
} from './uniswap-utils/utils';
import { MonitorCache } from './cache';

const NEW_ERC20_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days.
const NEW_LP_TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60; // 14 days.

export class BlockchainMonitor extends Service {
    private chainId: number;

    private provider: Web3RpcProvider;

    private cache: MonitorCache;

    constructor() {
        super();
        this.chainId = web3Config.CHAIN_ID;
        this.provider = new Web3RpcProvider(this.chainId);
        this.cache = new MonitorCache(
            NEW_ERC20_TTL_SECONDS,
            NEW_LP_TOKEN_TTL_SECONDS,
        );
    }

    // eslint-disable-next-line class-methods-use-this
    public async setup(): Promise<void> {
        await dal.connect();
    }

    // eslint-disable-next-line class-methods-use-this
    public async teardown(): Promise<void> {
        await dal.disconnect();
    }

    public async start(): Promise<void> {
        this.monitor();
    }

    private monitor(): void {
        this.provider.on('block', this.processBlock.bind(this));
    }

    @safe()
    private async processBlock(blockNumber: number) {
        // TODO: Handle skipped blocks.
        this.logger.info('Starting handling block', { blockNumber });
        const hexBlockNumber = hexifyNumber(blockNumber);
        const receipts = await this.provider.getTransactionReceipts(hexBlockNumber);
        // TODO: Consider handling blocks that we failed to query.
        if (!receipts) {
            return;
        }

        await Promise.all(
            receipts.map(this.processReceipt.bind(this)),
        );
        this.logger.info('Finished handling block', { blockNumber });
    }

    private async processReceipt(receipt: TransactionReceipt): Promise<void> {
        await Promise.all([
            this.processERC20Creation(receipt),
            this.processLogs(receipt),
        ]);
    }

    private async processERC20Creation(receipt: TransactionReceipt): Promise<void> {
        if (!receipt) {
            return;
        }
        if (receipt.to !== null) {
            // No contract creation.
            return;
        }

        if (!receipt?.contractAddress) {
            return;
        }

        const tokenAddr = receipt.contractAddress.toLowerCase();
        const erc20 = await this.provider.getERC20(tokenAddr);
        if (erc20) {
            await this.saveNewERC20(erc20);
            this.logger.info('New ERC20 token', { address: tokenAddr });
        }
    }

    private async processLogs(receipt: TransactionReceipt): Promise<void> {
        await Promise.all(
            receipt.logs.map(this.processLog.bind(this)),
        );
    }

    private async processLog(log: Log): Promise<void> {
        await Promise.all([
            this.processUniswapV2LPTokenCreation(log),
            this.processUniswapV3LPTokenCreation(log),
            this.processLPTokenTransfer(log),
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
        if (newToken) {
            await this.saveNewLPToken(pair);
            this.logger.info('Liquidity pair created for tracked token', { pair });
            // TODO: Sum all amount of new token turned into LP.
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
        if (newToken) {
            await this.saveNewLPToken(pool);
            this.logger.info('Liquidity pool created for tracked token', { pool });
            // TODO: Sum all amount of new token turned into LP.
        }
    }

    private async processLPTokenTransfer(log: Log): Promise<void> {
        const tokenAddress = log.address.toLowerCase();
        const parsed = parseTransfer(log);
        if (!parsed) {
            return;
        }
        if (!this.isNewLPToken(tokenAddress)) {
            this.logger.debug('Skipping transfer of untracked LP token');
            return;
        }

        const { from, to, amount } = parsed;

        if (DEAD_ADDRESSES.has(to)) {
            this.logger.info('LP token moved to burned address', {
                tokenAddress, from, to, amount: amount.toString(),
            });
            // TODO: check if amount moved is a big percentage of total supply of lp token
            // TODO: check that liquidity is more then $10,000
        }
    }

    private async saveNewERC20(erc20: ERC20): Promise<void> {
        const ttl = NEW_ERC20_TTL_SECONDS;
        this.cache.saveNewERC20(erc20);
        await dal.models.newErc20.saveNewERC20(erc20, ttl);
    }

    private async saveNewLPToken(address: string): Promise<void> {
        const ttl = NEW_LP_TOKEN_TTL_SECONDS;
        this.cache.saveNewLPToken(address);
        // TODO: Make relations between new erc20s and new lp tokens.
        await dal.models.newLpToken.saveNewLPToken(this.chainId, address, ttl);
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

    private async isNewLPToken(address: string): Promise<boolean> {
        // TODO: consider adding fallback.
        const isInCache = this.cache.isNewLPToken(address);
        const isNewInDB = !isInCache && await dal.models.newLpToken.isNewLPToken(
            this.chainId,
            address,
        );
        return isInCache ?? isNewInDB;
    }
}
