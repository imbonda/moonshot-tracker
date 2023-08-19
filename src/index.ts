// Third Party
import { ethers } from 'ethers';
import { Pool, FeeAmount } from '@uniswap/v3-sdk';
import { Token } from '@uniswap/sdk-core';
import dotenv from 'dotenv';
import Bottleneck from 'bottleneck';

// Internal
import uniswapV3PoolABI from './abi/uniswapV3PoolABI.json'
import uniswapV2PairABI from './abi/uniswapV2PairABI.json';
import uniswapV2FactoryABI from './abi/uniswapV2FactoryABI.json'; // Import Uniswap V2 Factory ABI
import uniswapV3FactoryABI from './abi/uniswapV3FactoryABI.json'; // Import Uniswap V3 Factory ABI
import erc20ABI from './abi/erc20ABI.json';

dotenv.config();

const limiter = new Bottleneck({
    minTime: 10, // Minimum time between requests (in milliseconds)
    maxConcurrent: 5
});

// Connect to Ethereum provider
const provider = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);

// Addresses to check for burnt or locked tokens
const BURNT_ADDRESS = '0x0000000000000000000000000000000000000000';

// Uniswap V3 Factory contract address
const uniswapV3FactoryAddress = '0x1F98431c8aD98523631AE4a59f267346ea31F984'; // Mainnet address

const uniswapV2FactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'; // Mainnet address

// Connect to Uniswap V2 Factory contract
const uniswapV2Factory = new ethers.Contract(uniswapV2FactoryAddress, uniswapV2FactoryABI, provider);

// Connect to Uniswap V3 Factory contract
const uniswapV3Factory = new ethers.Contract(uniswapV3FactoryAddress, uniswapV3FactoryABI, provider);

// Track tokens
const trackedTokens: Set<string> = new Set();

// Track LP tokens
const trackedLPTokens: Set<string> = new Set();

// Monitor all contract creations
provider.on('block', async (blockNumber) => {
    // Use Alchemy's alchemy_getTransactionReceipts method to get the transaction receipts
    const block = await provider.getBlock(blockNumber);
    if (!block) return;
    const receipts = await Promise.all(block.transactions.map(txHash =>
        limiter.schedule(() => provider.getTransactionReceipt(txHash))
    ));
    for (const transaction of receipts) {
        if (!transaction) return;
        if (transaction.to === null) { // Contract creation
            try {
                const receipt = await provider.getTransactionReceipt(transaction.hash);
                if (receipt?.contractAddress) {
                    const contract = new ethers.Contract(receipt.contractAddress, erc20ABI, provider);
                    const symbol = await contract.symbol();
                    if (symbol) {
                        trackedTokens.add(receipt.contractAddress);
                        console.log(`New ERC-20 token detected: ${receipt.contractAddress}`);
                    }
                }
            } catch (error) {
                // Not an ERC-20 token
            }
        }
    }
});

uniswapV2Factory.on('PairCreated', (token0, token1, pair) => {
    if (trackedTokens.has(token0) || trackedTokens.has(token1)) {
        console.log(`liquidty pair created for tracked token: ${pair}`);
        trackedLPTokens.add(pair);

        // Create a new contract instance for the LP token
        const lpTokenContract = new ethers.Contract(pair, uniswapV2PairABI, provider);

        // Listen for Transfer events on the LP token
        lpTokenContract.on('Transfer', handleTransfer);
    }
});

// Listen for Uniswap V3 Pool creation
uniswapV3Factory.on('PoolCreated', async (token0Address, token1Address, fee: FeeAmount, pool) => {
    if (trackedTokens.has(token0Address) || trackedTokens.has(token1Address)) {
        // Compute the pool address using the Uniswap V3 SDK
        // Create contract instances for the tokens
        const token0Contract = new ethers.Contract(token0Address, erc20ABI, provider);
        const token1Contract = new ethers.Contract(token1Address, erc20ABI, provider);

        // Retrieve the number of decimals for each token
        const [token0Decimals, token1Decimals] = await Promise.all([
            token0Contract.decimals(),
            token1Contract.decimals()
        ]);

        // Wrap the token addresses with the Token class
        const token0 = new Token(1, token0Address, token0Decimals);
        const token1 = new Token(1, token1Address, token1Decimals);

        const poolAddress = Pool.getAddress(token0, token1, fee);

        console.log(`Liquidity pool created for tracked token: ${poolAddress}`);
        trackedLPTokens.add(poolAddress);

        // Create a new contract instance for the LP token (Uniswap V3 Pool)
        const lpTokenContract = new ethers.Contract(poolAddress, uniswapV3PoolABI, provider);

        // Listen for Transfer events on the LP token
        lpTokenContract.on('Transfer', handleTransfer);
    }
});

// Function to handle LP token transfers
function handleTransfer(from: string, to: string, amount: ethers.BigNumberish) {
    if (to === BURNT_ADDRESS) {
        console.log(`LP token moved to burnt address! From: ${from}, To: ${to}, Amount: ${amount.toString()}`);
        //TODO - check if amount moved is a big percentage of totalsupply of lp token 
    }
}