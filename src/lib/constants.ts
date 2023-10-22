// 3rd party.
import { Interface } from 'ethers';
// Internal.
import uniswapV2FactoryABI from '../abi/uniswap-v2-factory.json';
import uniswapV2PairABI from '../abi/uniswap-v2-pair.json';
import uniswapV3FactoryABI from '../abi/uniswap-v3-factory.json';
import uniswapV3PoolABI from '../abi/uniswap-v3-pool.json';

export enum ChainId {
    ETH = 1,
    BSC = 56,
    POLYGON = 137,
    FTM = 250,
}

// Uniswap V2.
export const uniswapV2FactoryInterface = new Interface(uniswapV2FactoryABI);
export const uniswapV2PairInterface = new Interface(uniswapV2PairABI);
export const LP_V2_FACTORIES = new Set([
    // (ETH) Uniswap V2 Factory.
    '0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f',
    // (ETH) SushiSwap V2 Factory.
    '0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac',
    // (ETH) PancakeSwap V2 Factory.
    '0x1097053fd2ea711dad45caccc45eff7548fcb362',
    // (BSC) PancakeSwap V2 Factory.
    '0xca143ce32fe78f1f7019d7d551a6402fc5350c73',
    // (POLYGON) QuickSwap Factory.
    '0x5757371414417b8c6caad45baef941abc7d3ab32',
    // (FTM) SpookySwap Factory.
    '0x152ee697f2e276fa89e96742e9bb9ab1f2e61be3',
]);

// Uniswap V3.
export const uniswapV3FactoryInterface = new Interface(uniswapV3FactoryABI);
export const uniswapV3PoolInterface = new Interface(uniswapV3PoolABI);
export const LP_V3_FACTORIES = new Set([
    // (ETH) Uniswap V3 Factory.
    '0x1f98431c8ad98523631ae4a59f267346ea31f984',
]);

export const DEAD_ADDRESSES = new Set<string>([
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000001',
    '0x000000000000000000000000000000000000dead',
    '0x1111111111111111111111111111111111111111',
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '0xffffffffffffffffffffffffffffffffffffffff',
]);

export const MS_IN_SECOND = 1000;
