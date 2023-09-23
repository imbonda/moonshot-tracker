// 3rd party.
import { BigNumberish, Contract, JsonRpcProvider } from 'ethers';
import { Pool, FeeAmount } from '@uniswap/v3-sdk';
import { Token } from '@uniswap/sdk-core';
import Redis from 'ioredis';
import Queue from 'bull';
// Internal.
import erc20ABI from '../../abi/erc20.json';
import { throttle } from '../../lib/decorators';
import { Logger } from '../../lib/logger';
import {
    Chains, DEAD_ADDRESSES, MonitorStages, V2Factories, V3Factories,
} from '../../constants';
import {
    constructAvaliableChains,
    constructAvaliableProviders,
} from '../../utils';

export class TokenMonitor {
    private newERC20Addresses: Set<string>;

    private lpAddresses: Set<string>;

    private logger: Logger;

    private providerIndexes: Partial<Record<Chains, number>> = {};

    private queue: Queue.Queue<{
        stage: MonitorStages
        tokenAddress: string;
        chain: Chains;
    }>;

    private cacheDB: Redis;

    private providers: Record<Chains, JsonRpcProvider[]>;

    public type: string = process.env.INSTANCE_TYPE ?? 'consumer';

    public name: string = process.env.INSTANCE_NAME ?? 'default';

    public chains: Chains[] = [];

    constructor() {
        this.newERC20Addresses = new Set<string>();
        this.lpAddresses = new Set<string>();
        this.logger = new Logger(this.name);

        this.providers = constructAvaliableProviders();

        this.chains = constructAvaliableChains();

        this.cacheDB = new Redis({
            host: process.env.CACHING_DB_HOST,
            port: Number(process.env.CACHING_DB_PORT),
            password: process.env.CACHING_DB_PASSWORD,
            username: process.env.CACHING_DB_USERNAME ?? 'default',
        });

        this.queue = new Queue('token-monitor', {
            redis: {
                host: process.env.QUEUE_DB_HOST,
                port: Number(process.env.QUEUE_DB_PORT),
                password: process.env.QUEUE_DB_PASSWORD,
                username: process.env.QUEUE_DB_USERNAME ?? 'default',
            },
        });
    }

    private getProvider(chain: Chains) {
        if (!(chain in this.chains)) {
            throw new Error(`Tried to access inactive chain ${chain}, add supported providers to .env`);
        }

        if (this.providerIndexes[chain]) {
            const length = this.providers[chain]?.length;
            this.providerIndexes[chain] = (this.providerIndexes[chain]! + 1) % (length ?? 1);
        }

        const index = this.providerIndexes[chain] ?? 0;
        return this.providers[chain]?.[index] ?? '';
    }

    @throttle({ delayMs: 10, maxConcurrent: 5 })
    private async processERC20Creation(txHash: string, chain: Chains) {
        const receipt = await this.getProvider(chain).getTransactionReceipt(txHash);

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

        const contract = new Contract(
            receipt.contractAddress,
            erc20ABI,
            this.getProvider(chain),
        );

        try {
            const symbol = await contract.symbol();
            if (symbol) {
                this.newERC20Addresses.add(receipt.contractAddress);
                this.logger.info('New ERC20 token detected', { address: receipt.contractAddress });
                this.queue.add({
                    stage: MonitorStages.ERC20FOUND,
                    tokenAddress: receipt.contractAddress,
                    chain,
                });
            }
        } catch (err) {
            // Not an ERC-20 token.
        }
    }

    private monitorV2LPTokenCreation() {
        this.chains.forEach((chain) => {
            V2Factories.filter(({ chains }) => chains.includes(chain)).forEach((factory) => {
                const { factoryABI, lpABI, address } = factory;
                // Connect to Uniswap V2 Factory contract.
                const factoryContract = new Contract(
                    address,
                    factoryABI,
                    this.getProvider(chain),
                );

                factoryContract.on('PairCreated', (token1, token2, pair) => {
                    if (this.newERC20Addresses.has(token1) || this.newERC20Addresses.has(token2)) {
                        this.logger.info('Liquidity pair created for tracked token', { pair });
                        this.lpAddresses.add(pair);

                        // Create a new contract instance for the LP token.
                        const lpTokenContract = new Contract(pair, lpABI, this.getProvider(chain));
                        // Listen for Transfer events on the LP token.
                        lpTokenContract.on('Transfer', this.handleLPTokenTransfer);
                    }
                });
            });
        });
    }

    private monitorV3LPTokenCreation() {
        this.chains.forEach((chain) => {
            V3Factories.filter(({ chains }) => chains.includes(chain)).forEach((factory) => {
                const { factoryABI, lpABI, address } = factory;
                // Connect to Uniswap V3 Factory contract.
                const factoryContract = new Contract(
                    address,
                    factoryABI,
                    this.getProvider(chain),
                );

                // Listen for Uniswap V3 Pool creation
                factoryContract.on('PoolCreated', async (
                    token1Addr,
                    token2Addr,
                    fee: FeeAmount,
                ) => {
                    // Compute the pool address using the Uniswap V3 SDK
                    // Create contract instances for the tokens
                    const token1Contract = new Contract(
                        token1Addr,
                        erc20ABI,
                        this.getProvider(chain),
                    );

                    const token2Contract = new Contract(
                        token2Addr,
                        erc20ABI,
                        this.getProvider(chain),
                    );

                    // Retrieve the number of decimals for each token
                    const [token1Decimals, token2Decimals] = await Promise.all([
                        token1Contract.decimals(),
                        token2Contract.decimals(),
                    ]);

                    // Wrap the token addresses with the Token class.
                    const token1 = new Token(1, token1Addr, token1Decimals);
                    const token2 = new Token(1, token2Addr, token2Decimals);

                    const poolAddress = Pool.getAddress(token1, token2, fee);

                    this.logger.info('Liquidity pool created for tracked token', { poolAddress });
                    this.lpAddresses.add(poolAddress);

                    // Create a new contract instance for the LP token (Uniswap V3 Pool).
                    const lpTokenContract = new Contract(
                        poolAddress,
                        lpABI,
                        this.getProvider(chain),
                    );

                    // Listen for Transfer events on the LP token
                    lpTokenContract.on('Transfer', this.handleLPTokenTransfer);
                });
            });
        });
    }

    // eslint-disable-next-line class-methods-use-this
    private handleLPTokenTransfer(from: string, to: string, amount: BigNumberish) {
        // Function to handle LP token transfers
        if (to in DEAD_ADDRESSES) {
            this.logger.info('LP token moved to burned address!', {
                from, to, amount: amount.toString(),
            });
            // TODO - check if amount moved is a big percentage of totalsupply of lp token
        }
    }

    public monitorNewERC20Creation() {
        // Monitor all contract creations
        this.chains.forEach((chain) => {
            this.getProvider(chain).on('block', async (blockNumber) => {
                const block = await this.getProvider(chain).getBlock(blockNumber);
                if (!block) {
                    return;
                }

                await Promise.all(
                    block.transactions.map((tx) => this.processERC20Creation(tx, chain)),
                );
            });
        });
    }

    public monitorStages() {
        this.queue.process(async (job) => {
            const { stage } = job.data;

            if (stage === MonitorStages.ERC20FOUND) {
                this.monitorV2LPTokenCreation();
                this.monitorV3LPTokenCreation();
            }
        });
    }
}
