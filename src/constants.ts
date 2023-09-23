import uniswapV2PairABI from './abi/uniswap-v2-pair.json';
import uniswapV2FactoryABI from './abi/uniswap-v2-factory.json';
import uniswapV3FactoryABI from './abi/uniswap-v3-factory.json';
import uniswapV3PoolABI from './abi/uniswap-v3-pool.json';

export enum MonitorStages {
    ERC20FOUND = 'erc20found',
    LPFOUND = 'lpfound',
    ENOUGHLPBURNT = 'enoughlpburnt',
}

export enum FactoryTypes {
    V1 = 'v1',
    V2 = 'v2',
    V3 = 'v3',
}

export enum Chains {
    ETH = '1',
    BSC = '56',
    POLYGON = '137',
    FTM = '250',
}

export const PROVIDERS: Partial<Record<Chains, string[]>> = {
    [Chains.ETH]: JSON.parse(process.env.ETH_PROVIDERS ?? '[]'),
    [Chains.BSC]: JSON.parse(process.env.BSC_PROVIDERS ?? '[]'),
    [Chains.FTM]: JSON.parse(process.env.FTM_PROVIDERS ?? '[]'),
    [Chains.POLYGON]: JSON.parse(process.env.POLYGON_PROVIDERS ?? '[]'),
};

export enum V2FactoryNames {
    UniswapV2 = 'uniswapv2',
    SushiSwapV2 = 'sushiswapv2',
    PancakeSwapV2BSC = 'pancakeswapv2bsc',
    PancakeSwapV2ETH = 'pancakeswapv2eth',
    QuickSwap = 'quickswap',
    SpookySwap = 'spookyswap',
}

export enum V3FactoryNames {
    UniswapV3 = 'uniswapv3',
}

export const FACTORIES = {
    [V3FactoryNames.UniswapV3]: {
        name: 'Uniswap V3 Factory',
        id: V3FactoryNames.UniswapV3,
        address: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
        chains: [Chains.ETH],
        type: FactoryTypes.V3,
        factoryABI: uniswapV3FactoryABI,
        lpABI: uniswapV3PoolABI,
    },
    [V2FactoryNames.UniswapV2]: {
        name: 'Uniswap V2 Factory',
        id: V2FactoryNames.UniswapV2,
        address: '0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f',
        chains: [Chains.ETH],
        type: FactoryTypes.V2,
        factoryABI: uniswapV2FactoryABI,
        lpABI: uniswapV2PairABI,
    },
    [V2FactoryNames.SushiSwapV2]: {
        name: 'SushiSwap V2 Factory',
        id: V2FactoryNames.SushiSwapV2,
        address: '0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac',
        chains: [Chains.ETH],
        type: FactoryTypes.V2,
        factoryABI: uniswapV2FactoryABI,
        lpABI: uniswapV2PairABI,
    },
    [V2FactoryNames.PancakeSwapV2BSC]: {
        name: 'PancakeSwap V2 Factory',
        id: V2FactoryNames.PancakeSwapV2BSC,
        address: '0xca143ce32fe78f1f7019d7d551a6402fc5350c73',
        chains: [Chains.BSC],
        type: FactoryTypes.V2,
        factoryABI: uniswapV2FactoryABI,
        lpABI: uniswapV2PairABI,
    },
    [V2FactoryNames.PancakeSwapV2ETH]: {
        name: 'PancakeSwap V2 Factory',
        id: V2FactoryNames.PancakeSwapV2ETH,
        address: '0x1097053fd2ea711dad45caccc45eff7548fcb362',
        chains: [Chains.ETH],
        type: FactoryTypes.V2,
        factoryABI: uniswapV2FactoryABI,
        lpABI: uniswapV2PairABI,
    },
    [V2FactoryNames.QuickSwap]: {
        name: 'QuickSwap Factory',
        id: V2FactoryNames.QuickSwap,
        address: '0x5757371414417b8c6caad45baef941abc7d3ab32',
        chains: [Chains.POLYGON],
        type: FactoryTypes.V2,
        factoryABI: uniswapV2FactoryABI,
        lpABI: uniswapV2PairABI,
    },
    [V2FactoryNames.SpookySwap]: {
        name: 'SpookySwap Factory',
        id: V2FactoryNames.SpookySwap,
        address: '0x152ee697f2e276fa89e96742e9bb9ab1f2e61be3',
        chains: [Chains.FTM],
        type: FactoryTypes.V2,
        factoryABI: uniswapV2FactoryABI,
        lpABI: uniswapV2PairABI,
    },
};

export const V1Factories = Object.values(FACTORIES).filter(
    ({ type }) => type === FactoryTypes.V1,
);

export const V2Factories = Object.values(FACTORIES).filter(
    ({ type }) => type === FactoryTypes.V2,
);

export const V3Factories = Object.values(FACTORIES).filter(
    ({ type }) => type === FactoryTypes.V3,
);

export const DEAD_ADDRESSES = Object.fromEntries([
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000001',
    '0x000000000000000000000000000000000000dead',
    '0x1111111111111111111111111111111111111111',
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '0xffffffffffffffffffffffffffffffffffffffff',
].map((address) => [address, true]));
