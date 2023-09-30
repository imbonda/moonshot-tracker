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

export const LP_V3_FACTORIES = [
    {
        name: 'Uniswap V3 Factory',
        chains: [ChainId.ETH],
        address: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
        factoryABI: uniswapV3FactoryABI,
        lpABI: uniswapV3PoolABI,
    },
];

export const LP_V2_FACTORIES = [
    {
        name: 'Uniswap V2 Factory',
        chains: [ChainId.ETH],
        address: '0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f',
        factoryABI: uniswapV2FactoryABI,
        lpABI: uniswapV2PairABI,
    },
    {
        name: 'SushiSwap V2 Factory',
        chains: [ChainId.ETH],
        address: '0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac',
        factoryABI: uniswapV2FactoryABI,
        lpABI: uniswapV2PairABI,
    },
    {
        name: 'PancakeSwap V2 Factory',
        chains: [ChainId.BSC],
        address: '0xca143ce32fe78f1f7019d7d551a6402fc5350c73',
        factoryABI: uniswapV2FactoryABI,
        lpABI: uniswapV2PairABI,
    },
    {
        name: 'PancakeSwap V2 Factory',
        chains: [ChainId.ETH],
        address: '0x1097053fd2ea711dad45caccc45eff7548fcb362',
        factoryABI: uniswapV2FactoryABI,
        lpABI: uniswapV2PairABI,
    },
    {
        name: 'QuickSwap Factory',
        chains: [ChainId.POLYGON],
        address: '0x5757371414417b8c6caad45baef941abc7d3ab32',
        factoryABI: uniswapV2FactoryABI,
        lpABI: uniswapV2PairABI,
    },
    {
        name: 'SpookySwap Factory',
        chains: [ChainId.FTM],
        address: '0x152ee697f2e276fa89e96742e9bb9ab1f2e61be3',
        factoryABI: uniswapV2FactoryABI,
        lpABI: uniswapV2PairABI,
    },
];

export const DEAD_ADDRESSES = new Set<string>([
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000001',
    '0x000000000000000000000000000000000000dead',
    '0x1111111111111111111111111111111111111111',
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '0xffffffffffffffffffffffffffffffffffffffff',
]);
