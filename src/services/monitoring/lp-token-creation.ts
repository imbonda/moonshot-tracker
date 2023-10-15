// 3rd party.
import { BigNumberish, Contract } from 'ethers';
// Internal.
import { Token } from '@uniswap/sdk-core';
import { FeeAmount, Pool } from '@uniswap/v3-sdk';
import erc20ABI from '../../abi/erc20.json';
import { web3Config } from '../../config';
import { dal } from '../../dal/dal';
import { Service } from '../service';
import { DEAD_ADDRESSES, LP_V2_FACTORIES, LP_V3_FACTORIES } from '../../lib/constants';
import { Web3RpcProvider } from '../../lib/adapters/rpc-provider';

export class LPTokenCreationMonitor extends Service {
    private chainId: number;

    private web3RpcProvider: Web3RpcProvider;

    constructor() {
        super();
        this.chainId = web3Config.CHAIN_ID;
        this.web3RpcProvider = new Web3RpcProvider(this.chainId);
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

    private monitor() {
        this.monitorUniswapV2LPTokenCreation();
        this.monitorUniswapV3LPTokenCreation();
    }

    private monitorUniswapV2LPTokenCreation() {
        LP_V2_FACTORIES.forEach((factory) => {
            const { factoryABI, lpABI, address } = factory;
            const provider = this.web3RpcProvider.alloc();

            // Connect to V2 Factory contract.
            const factoryContract = new Contract(
                address,
                factoryABI,
                provider,
            );

            factoryContract.on('PairCreated', async (token1Addr, token2Addr, pair) => {
                const [isToken1New, isToken2New] = await Promise.all([
                    this.isNewERC20(token1Addr),
                    this.isNewERC20(token2Addr),
                ]);
                if (isToken1New || isToken2New) {
                    this.logger.info('Liquidity pair created for tracked token', { pair });
                    // TODO: publish "LP_TOKEN_CREATED" event for "pair".

                    // Create a new contract instance for the LP token.
                    const lpTokenContract = new Contract(pair, lpABI, provider);
                    // Listen for Transfer events on the LP token.
                    lpTokenContract.on('Transfer', this.handleLPTokenTransfer);
                }
            });
        });
    }

    private monitorUniswapV3LPTokenCreation() {
        LP_V3_FACTORIES.forEach((factory) => {
            const { factoryABI, lpABI, address } = factory;
            const provider = this.web3RpcProvider.alloc();

            // Connect to V3 Factory contract.
            const factoryContract = new Contract(
                address,
                factoryABI,
                provider,
            );

            factoryContract.on('PoolCreated', async (
                token1Addr,
                token2Addr,
                fee: FeeAmount,
            ) => {
                const [isToken1New, isToken2New] = await Promise.all([
                    this.isNewERC20(token1Addr),
                    this.isNewERC20(token2Addr),
                ]);
                if (isToken1New || isToken2New) {
                    // Compute the pool address using the Uniswap V3 SDK
                    // Create contract instances for the tokens
                    const token1Contract = new Contract(token1Addr, erc20ABI, provider);
                    const token2Contract = new Contract(token2Addr, erc20ABI, provider);

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
                    // TODO: publish "LP_TOKEN_CREATED" event for "poolAddress".

                    // Create a new contract instance for the LP token (Uniswap V3 Pool).
                    const lpTokenContract = new Contract(poolAddress, lpABI, provider);

                    // Listen for Transfer events on the LP token
                    lpTokenContract.on('Transfer', this.handleLPTokenTransfer);
                }
            });
        });
    }

    // eslint-disable-next-line class-methods-use-this
    private handleLPTokenTransfer(from: string, to: string, amount: BigNumberish) {
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
        // TODO: add cache.
        // TODO: add fallback to rpc (check if exists X blocks ago).
        const isNewInDB = dal.models.newErc20.isNewERC20(this.chainId, address);
        return isNewInDB;
    }
}
