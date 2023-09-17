// 3rd party.
import { BigNumberish, Contract, JsonRpcProvider } from 'ethers';
import { Pool, FeeAmount } from '@uniswap/v3-sdk';
import { Token } from '@uniswap/sdk-core';
// Internal.
import uniswapV2PairABI from '../../abi/uniswap-v2-pair.json';
import uniswapV2FactoryABI from '../../abi/uniswap-v2-factory.json';
import uniswapV3FactoryABI from '../../abi/uniswap-v3-factory.json';
import uniswapV3PoolABI from '../../abi/uniswap-v3-pool.json';
import erc20ABI from '../../abi/erc20.json';
import { throttle } from '../../lib/decorators';
import { Logger } from '../../lib/logger';

// Uniswap V2 Factory mainnet contract address.
const uniswapV2FactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';

// Uniswap V3 Factory mainnet contract address.
const uniswapV3FactoryAddress = '0x1F98431c8aD98523631AE4a59f267346ea31F984';

// Addresses to check for burnt or locked tokens.
const BURNT_ADDRESS = '0x0000000000000000000000000000000000000000';

export class TokenMonitor {
    private newERC20Addresses: Set<string>;

    private lpAddresses: Set<string>;

    private provider: JsonRpcProvider;

    private logger: Logger;

    constructor() {
        this.newERC20Addresses = new Set<string>();
        this.lpAddresses = new Set<string>();
        this.provider = new JsonRpcProvider(this.providerURL);
        this.logger = new Logger(this.constructor.name);
    }

    // eslint-disable-next-line class-methods-use-this
    private get providerURL() {
        return `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    }

    public monitor() {
        this.monitorNewERC20Creation();

        this.monitorUniswapV2LPTokenCreation();

        this.monitorUniswapV3LPTokenCreation();
    }

    private monitorNewERC20Creation() {
        // Monitor all contract creations
        this.provider.on('block', async (blockNumber) => {
            // Use Alchemy's alchemy_getTransactionReceipts method to get the transaction receipts
            const block = await this.provider.getBlock(blockNumber);
            if (!block) {
                return;
            }

            await Promise.all(
                block.transactions.map(this.processERC20Creation.bind(this)),
            );
        });
    }

    @throttle({ delayMs: 10, maxConcurrent: 5 })
    private async processERC20Creation(txHash: string) {
        const receipt = await this.provider.getTransactionReceipt(txHash);

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
            this.provider,
        );

        try {
            const symbol = await contract.symbol();
            if (symbol) {
                this.newERC20Addresses.add(receipt.contractAddress);
                this.logger.info('New ERC20 token detected', { address: receipt.contractAddress });
            }
        } catch (err) {
            // Not an ERC-20 token.
        }
    }

    private monitorUniswapV2LPTokenCreation() {
        // Connect to Uniswap V2 Factory contract.
        const uniswapV2Factory = new Contract(
            uniswapV2FactoryAddress,
            uniswapV2FactoryABI,
            this.provider,
        );

        uniswapV2Factory.on('PairCreated', (token1, token2, pair) => {
            if (this.newERC20Addresses.has(token1) || this.newERC20Addresses.has(token2)) {
                this.logger.info('Liquidity pair created for tracked token', { pair });
                this.lpAddresses.add(pair);

                // Create a new contract instance for the LP token.
                const lpTokenContract = new Contract(pair, uniswapV2PairABI, this.provider);
                // Listen for Transfer events on the LP token.
                lpTokenContract.on('Transfer', this.handleLPTokenTransfer);
            }
        });
    }

    private monitorUniswapV3LPTokenCreation() {
        // Connect to Uniswap V3 Factory contract.
        const uniswapV3Factory = new Contract(
            uniswapV3FactoryAddress,
            uniswapV3FactoryABI,
            this.provider,
        );

        // Listen for Uniswap V3 Pool creation
        uniswapV3Factory.on('PoolCreated', async (
            token1Addr,
            token2Addr,
            fee: FeeAmount,
        ) => {
            if (this.newERC20Addresses.has(token1Addr) || this.newERC20Addresses.has(token2Addr)) {
                // Compute the pool address using the Uniswap V3 SDK
                // Create contract instances for the tokens
                const token1Contract = new Contract(token1Addr, erc20ABI, this.provider);
                const token2Contract = new Contract(token2Addr, erc20ABI, this.provider);

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
                const lpTokenContract = new Contract(poolAddress, uniswapV3PoolABI, this.provider);

                // Listen for Transfer events on the LP token
                lpTokenContract.on('Transfer', this.handleLPTokenTransfer);
            }
        });
    }

    // eslint-disable-next-line class-methods-use-this
    private handleLPTokenTransfer(from: string, to: string, amount: BigNumberish) {
        // Function to handle LP token transfers
        if (to === BURNT_ADDRESS) {
            this.logger.info('LP token moved to burned address!', {
                from, to, amount: amount.toString(),
            });
            // TODO - check if amount moved is a big percentage of totalsupply of lp token
        }
    }
}
