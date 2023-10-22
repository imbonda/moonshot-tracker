// 3rd party.
import { Contract, Log, type TransactionReceipt } from 'ethers';
import NodeCache from 'node-cache';
// Internal.
import erc20ABI from '../../abi/erc20.json';
import { web3Config } from '../../config';
import { safe, throttle } from '../../lib/decorators';
import { dal } from '../../dal/dal';
import { Web3RpcProvider } from '../../lib/adapters/rpc-provider';
import { hexifyNumber } from '../../lib/utils';
import { Service } from '../service';
import {
    DEAD_ADDRESSES,
    LP_V2_FACTORIES, LP_V3_FACTORIES,
    uniswapV2FactoryInterface, uniswapV3FactoryInterface,
} from '../../lib/constants';
import {
    parsePairAddress, parsePoolAddress, parseTokenAddresses, parseTransfer,
} from './uniswap-utils/utils';

const NEW_ERC20_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days.

export class BlockchainMonitor extends Service {
    private chainId: number;

    private provider: Web3RpcProvider;

    private newERC20Cache: NodeCache;

    private newLPTokenCache: NodeCache;

    constructor() {
        super();
        this.chainId = web3Config.CHAIN_ID;
        this.provider = new Web3RpcProvider(this.chainId);
        this.newERC20Cache = new NodeCache({ stdTTL: NEW_ERC20_TTL_SECONDS });
        this.newLPTokenCache = new NodeCache();
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
        const hexBlockNumber = hexifyNumber(blockNumber);
        const receipts = await this.provider.getTransactionReceipts(hexBlockNumber);
        if (!receipts) {
            return;
        }

        await Promise.all(
            receipts.map(this.process.bind(this)),
        );
    }

    private async process(receipt: TransactionReceipt): Promise<void> {
        await Promise.all([
            this.processERC20Creation(receipt),
            this.processLogs(receipt),
        ]);
    }

    @throttle({ delayMs: 10, maxConcurrent: 5 })
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
        const contract = new Contract(
            tokenAddr,
            erc20ABI,
            this.provider,
        );

        try {
            const symbol = await contract.symbol();
            if (symbol) {
                const ttl = NEW_ERC20_TTL_SECONDS;
                this.newERC20Cache.set(tokenAddr, 1);
                await dal.models.newErc20.saveNewERC20(this.chainId, tokenAddr, ttl);
                this.logger.info('New ERC20 token', { address: tokenAddr });
            }
        } catch (err) {
            // Not an ERC-20 token.
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
        const [isToken1New, isToken2New] = await Promise.all([
            this.isNewERC20(token1Addr),
            this.isNewERC20(token2Addr),
        ]);
        if (isToken1New || isToken2New) {
            this.newLPTokenCache.set(pair, 1);
            this.logger.info('Liquidity pair created for tracked token', { pair });
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
        const [isToken1New, isToken2New] = await Promise.all([
            this.isNewERC20(token1Addr),
            this.isNewERC20(token2Addr),
        ]);
        if (isToken1New || isToken2New) {
            this.newLPTokenCache.set(pool, 1);
            this.logger.info('Liquidity pool created for tracked token', { pool });
        }
    }

    private async processLPTokenTransfer(log: Log): Promise<void> {
        const tokenAddress = log.address.toLowerCase();
        const parsed = parseTransfer(log);
        if (!parsed) {
            return;
        }
        if (!this.newLPTokenCache.get(tokenAddress)) {
            this.logger.info('Skipping transfer of untracked LP token');
            return;
        }

        const { from, to, amount } = parsed;

        // Function to handle LP token transfers
        if (DEAD_ADDRESSES.has(to)) {
            this.logger.info('LP token moved to burned address', {
                from, to, amount: amount.toString(),
            });
            // TODO: check if amount moved is a big percentage of total supply of lp token
            // TODO: check that liquidity is more then $10,000
        }
    }

    private async isNewERC20(address: string): Promise<boolean> {
        // TODO: add fallback to rpc (check if exists X blocks ago).
        const isInCache = !!this.newERC20Cache.get(address);
        const isNewInDB = !isInCache && await dal.models.newErc20.isNewERC20(this.chainId, address);
        return isInCache ?? isNewInDB;
    }
}
